import axios from "axios";
import * as fs from 'fs';
import { Client } from "tmi.js";
import { Song, SongFactory } from "./data/song";
import { DLC } from "./data/dlc";
import { Difficulty } from "./data/difficulty";
import { createInterface } from "readline";
import { JSONData, SongAliases, Utils } from "./utils/utils";
import { ScoreManager } from "./data/score";

console.log('[하판봇] 하판봇이 시작됩니다.');

const account: JSONData = (() => {
    const account = JSON.parse(fs.readFileSync('./resources/account.json', 'utf-8'));
    if(typeof account.v_archive !== 'object' || !account.v_archive.nickname){
        throw new Error("[하판봇] v archive 계정 정보가 잘못되었거나 없습니다.");
    }
    
    if(!account.v_archive.id || !account.v_archive.token){
        const data = fs.readFileSync('./resources/account.txt', 'utf-8').trim().split(" ");
        if(data.length < 2){
            throw new Error("[하판봇] account.txt 파일이 잘못되었습니다.")
        }
        account.v_archive.id = data[0];
        account.v_archive.token = data[1];
        fs.unlinkSync('./resources/account.txt');
        fs.writeFileSync('./resources/account.json', JSON.stringify(account, null, 4), 'utf-8');
    }

    if(
        typeof account.twitch !== 'object' ||
        typeof account.twitch.identity !== 'object' ||
        !account.twitch.username || !account.twitch.password ||
        typeof account.twitch.channels !== 'object' || account.twitch.channels.length < 1
    ){
        delete account.twitch;
        console.log("[하판봇] 트위치 계정 정보가 잘못되었습니다. 트위치 연결을 해제합니다.");
        return account;
    }
    return account;
})();
console.log('[하판봇] 계정 정보를 불러왔습니다.');

SongAliases.loadData();
console.log('[하판봇] 축약어 기록을 불러왔습니다.');

axios.get('https://v-archive.net/db/songs.json')
.then(body => {
    for(const songData of body.data){
        const song = Song.parse(songData);
        DLC.addDefault(song.dlc);
        SongFactory.add(song);
    }
    console.log('[하판봇] 곡 정보를 불러왔습니다.');
})
.then(() => {
    ScoreManager.init();
    
    let count = 0;
    const boardList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, "MX", "SC"];
    for(const button of [4, 5, 6, 8]){
        for(const board of boardList){
            axios.get(`https://v-archive.net/api/archive/${account.v_archive.nickname}/board/${button}/${board}`)
            .then(body => {
                for(const obj of body.data.floors){
                    for(const data of obj.patterns){
                        const rate = parseFloat(data.score);
                        if(!isNaN(rate)){
                            const difficulty = Difficulty.parse(button, data.pattern);
                            if(difficulty === null){
                                continue;
                            }

                            const song = SongFactory.get(data.title);
                            if(!!song){ // 예외처리한 곡이 v archive에 있는 경우가 있을 수 있음
                                ScoreManager.setScore(song, difficulty, rate, data.maxCombo);
                            }
                        }
                    }
                }

                if(++count >= boardList.length * 4){
                    console.log('[하판봇] v-archive 기록을 불러왔습니다.');
                }
            });
        }
    }
});

let requestData: JSONData = {};
let lastCommandTime: number = new Date().getTime();

if(!!account.twitch){
    const client = new Client(account.twitch);
    client.on('message', (channel, user, msg, self) => {
        if(self){
            return;
        }
        processPrecommand(msg, user, (m: string) => client.say(channel, m));
    });
    client.connect()
        .then(() => console.log('[하판봇] 트위치에 연결되었습니다.'))
        .catch(() => console.log('[하판봇] 트위치 연결에 실패했습니다.'));
}

const readline = createInterface({input: process.stdin});
readline.on('line', msg => {
    processPrecommand(
        msg,
        {mod: true, 'display-name': 'console'},
        (m: string) => console.log(m)
    )
});

function sendScore(song: Song, difficulty: Difficulty, rate: number, maxCombo: boolean, output: (msg: string) => void): void{
    const data = {
        name: song.name,
        composer: song.composer,
        button: difficulty.button,
        pattern: difficulty.toString(true),
        score: rate,
        maxCombo: maxCombo ? 1 : 0
    };
    axios.post(`https://v-archive.net/client/open/${account.v_archive.id}/score`, data, {
        headers: {
            "Content-Type": `application/json`,
            "Authorization": `${account.v_archive.token}`
        }
    })
    .then(body => {
        if(body.data.success === true){
            const score = ScoreManager.getScore(song, difficulty);
            if(body.data.update === false){
                output(`[하판봇] 기존 기록(${score})이 더 높아 등록되지 않았습니다. `);
            }else{
                const data = ScoreManager.setScore(song, difficulty, Math.max(score.rate, rate), score.maxCombo || maxCombo);
                output(`[하판봇] 저장 성공. ${song.toString(difficulty)}: ${data}`);
            }
        }else if(body.data.message){
            output(`[하판봇] ${body.data.message}`);
        }else{
            output(`[하판봇] 기록 저장 실패.`);
        }
    });
}

function processPrecommand(msg: string, user: JSONData, output: (msg: string) => void): void{
    const args = Utils.parseCommand(msg);
    if(args.length < 1){
        return;
    }else if(new Date().getTime() - lastCommandTime < 1000){ // 글로벌 쿨타임
        return;
    }
    
    const command = args.shift() + "";
    if('songList' in requestData){
        if(new Date().getTime() - requestData['updateTime'] < 15000){
            if(user['display-name'] === requestData['username'] && command.length === 1){
                const index = parseInt(command);
                if(!isNaN(index)){
                    if(requestData.songList.length >= index){
                        const song = requestData.songList[index - 1];
                        switch(requestData.type){
                            case 0: // send score
                                sendScore(song, requestData.difficulty, requestData.rate, requestData.maxCombo, output);
                                return;
                            case 1:
                                const scoreData = ScoreManager.getScore(song, requestData.difficulty);
                                if(scoreData.rate > 0){
                                    output(`[하판봇] ${song.toString(requestData.difficulty)}: ${scoreData}`);
                                }else{
                                    output(`[하판봇] ${song.toString(requestData.difficulty)}: 기록 없음`);
                                }
                                return;
                            case 2:
                                const alias = SongAliases.setAlias(requestData.alias, song);
                                output(`[하판봇] 축약어를 등록하였습니다. (${alias})`);
                                break;
                        }
                    }else if(requestData.songList.length + 1 === index && requestData.type === 2){
                        const alias = SongAliases.setAlias(requestData.alias, requestData.name);
                        output(`[하판봇] 축약어를 등록하였습니다. (${alias})`);
                    }
                }
            }
        }else{
            requestData = {};
        }
    }
    if(!command || command[0] !== "!"){
        return;
    }
    lastCommandTime = new Date().getTime();
    processCommand(
        command.substring(1),
        args,
        user,
        output
    );
}

function processCommand(command: string, args: string[], user: JSONData, output: (m: string) => void){
    if(command === "저장" || command === "기갱"){
        if(!user.mod && user.badges?.broadcaster !== '1'){
            output(`[하판봇] 하판 기록 저장은 관리자만 가능합니다.`);
            return;
        }
        
        if(args.length < 3){
            output(`[하판봇] !${command} <곡명[||DLC/작곡가]> <난이도> <레이트> [풀콤]`);
            return;
        }
        
        let maxCombo = false;
        const lastData = args.pop() + '';
        let rate = parseFloat(lastData);
        if(isNaN(rate)){ // 풀콤 여부 검증
            const rateData = args.pop() + '';
            rate = parseFloat(rateData);
            if(isNaN(rate)){
                output(`[하판봇] 올바른 레이트값을 입력해주세요. (입력값: ${rateData}, ${lastData})`);
                return;
            }
            maxCombo = true;
        }
        if(isNaN(rate)){
            output(`[하판봇] 올바른 레이트값을 입력해주세요. (입력값: ${lastData})`);
            return;
        }
        if(rate < 0.01 || rate > 100){
            output(`[하판봇] 레이트는 0.01% ~ 100.00% 사이의 값만 가능합니다.`);
            return;
        }

        maxCombo = rate > 99.99 || maxCombo;
        const btnDiff = args.pop() + '';
        const phase = findSongWithDifficultyPhase(args.join(" "), btnDiff, user['display-name']);
        if(typeof phase === 'string'){
            if('songList' in requestData){
                requestData.type = 0;
                requestData.rate = rate;
                requestData.maxCombo = maxCombo;
            }
            output(phase);
            return;
        }
        sendScore(phase[0], phase[1], rate, maxCombo, output);
    }else if(command === "점수" || command === "기록"){
        if(args.length < 2){
            output(`[하판봇] !${command} <곡명[||DLC]> <난이도>`);
            return;
        }
        
        const btnDiff = args.pop() + '';
        const phase = findSongWithDifficultyPhase(args.join(" "), btnDiff, user['display-name']);
        if(typeof phase === 'string'){
            if('songList' in requestData){
                requestData.type = 1;
            }
            output(phase);
            return;
        }

        let [song, difficulty] = phase;
        const scoreData = ScoreManager.getScore(song, difficulty);
        if(scoreData.rate > 0){
            output(`[하판봇] ${song.toString(difficulty)}: ${scoreData}`);
        }else{
            output(`[하판봇] ${song.toString(difficulty)}: 기록 없음`);
        }
    }else if(command === "축약"){
        if(args.length < 2){
            output(`[하판봇] !${command} <축약어> <원곡명>`);
            return;
        }

        const alias = args.shift() + '';
        if(!!SongAliases.getAlias(alias)){
            output(`[하판봇] '${alias}'은(는) 이미 존재하는 축약어입니다.`);
            return;
        }

        const findSongList = findSongPhase(args.join(" "));
        if(typeof findSongList === 'string'){
            return findSongList;
        }else if(findSongList.length > 1){
            if(findSongList.length <= 3){
                requestData = {
                    type: 2,
                    alias: alias,
                    songList: findSongList,
                    username: user['display-name'],
                    updateTime: new Date().getTime(),
                };
                const first = findSongList[0].name;
                const sameList = findSongList.filter(song => song.name === first);
                let songOutput = findSongList.map((s, index) => `${index + 1}. ${s.name}(${s.dlc})`).join(', ');
                if(sameList.length === findSongList.length){
                    requestData.name = first;
                    songOutput += `, ${findSongList.length + 1}. ${first}(이름만 축약)`
                }
                output(`[하판봇] 중복 발견. 번호를 입력해주세요. ${songOutput}`);
                return;
            }else{
                output(`[하판봇] 중복되는 곡이 많습니다. 이름을 정확히 입력해주세요.`);
                return;
            }
        }
        const aliasData = SongAliases.setAlias(alias, findSongList[0]);
        output(`[하판봇] 축약어를 등록하였습니다. (${aliasData})`);
    }else if(command === "페이지"){
        output('[하판봇] v-archive: https://v-archive.net/archive/lei_hard/board');
    }
}

function findSongPhase(nameData: string): string | Song[]{
    let songInfo = nameData.split("||").map(v => v.trim());
    let name = songInfo[0].toLowerCase();
    let dlc = null;
    let composer = null;
    let checkESTi = false;
    if(songInfo.length > 1){
        dlc = DLC.parse(songInfo[1]);
        if(dlc?.dlcCode === 'ESTI'){
            checkESTi = true;
        }else if(!dlc){
            composer = songInfo[1];
        }
    }else{
        const checkAlias = SongAliases.getAlias(name);
        if(!!checkAlias){
            [name, composer] = checkAlias.split("||");
        }
    }
    let findSongList;
    if(checkESTi){
        findSongList = SongFactory.findByESTi(name);
    }else if(!!dlc){
        findSongList = SongFactory.findByDLC(name, dlc);
    }else if(!!composer){
        findSongList = SongFactory.findByComposer(name, composer);
    }else{
        findSongList = SongFactory.find(name);
    }

    if(findSongList.length < 1){
        return `[하판봇] '${songInfo[0]}${songInfo.length > 1 ? `(${songInfo[1]})` : ""}'에 해당되는 곡을 찾을 수 없었습니다.`;
    }
    return findSongList;
}

function findSongWithDifficultyPhase(nameData: string, btnDiff: string, username: string): string | any[]{
    const difficulty = Difficulty.parse(btnDiff);
    if(difficulty === null){
        return `[하판봇] 키 또는 난이도가 잘못되었습니다. (예: 5sc, 입력값: ${btnDiff})`;
    }

    let findSongList = findSongPhase(nameData);
    if(typeof findSongList === 'string'){
        return findSongList;
    }
    
    const newSongList = findSongList.filter(song => song.havePattern(difficulty));
    if(newSongList.length < 1){
        return `[하판봇] 검색된 곡 내에서 해당 난이도(${difficulty.toStringButton()})가 존재하는 곡이 없습니다.`;
    }else if(newSongList.length > 1){
        if(newSongList.length <= 3){
            requestData = {
                songList: newSongList,
                difficulty: difficulty,
                username: username,
                updateTime: new Date().getTime(),
            };
            return `[하판봇] 중복 발견. 번호를 입력해주세요. ${newSongList.map((s, index) => `${index + 1}. ${s.name}(${s.dlc})`).join(', ')}`;
        }else{
            return `[하판봇] 중복되는 곡이 많습니다. 이름을 정확히 입력해주세요.`;
        }
    }
    return [newSongList[0], difficulty];
}