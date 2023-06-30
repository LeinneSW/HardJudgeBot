import { JSONData } from "../utils/utils";
import { Difficulty } from "./difficulty";
import { DLC } from "./dlc";

export class Song{
    private constructor(
        public readonly id: number,
        public readonly name: string,
        public readonly composer: string,
        public readonly dlc: DLC,
        public readonly patterns: string[][]
    ){}

    static parse(data: JSONData): Song{
        let patterns = [];
        for(const key in data.patterns){
            const index = Math.min(parseInt(key) - 4, 3);
            patterns[index] = Object.keys(data.patterns[key]);
        }
        return new Song(data.title, data.name, data.composer, new DLC(data.dlc, data.dlcCode), patterns);
    }

    havePattern(difficulty: Difficulty): boolean{
        const index = Math.min(difficulty.button - 4, 3);
        return this.patterns[index].includes(difficulty.toString());
    }

    toString(difficulty?: Difficulty): string{
        let diffStr = '';
        if(!!difficulty){
            diffStr = ` ${difficulty.button}${difficulty}`;
        }
        return `${this.name}[${this.dlc}]${diffStr}`;
    }
}

export class SongFactory{
    private static list: {[key: number]: Song} = [];
    private static blackWordList: string[] = [
        'nonstop',
        'extended',
        'original ver',
        "Deepin' Absonant Mix"
    ]

    static add(song: Song): void{
        const name = song.name.toLowerCase();
        if(this.blackWordList.filter(v => name.includes(v)).length <= 0){
            this.list[song.id] = song;
        }
    }

    static get(id: number): Song{
        return this.list[id];
    }

    static getAll(): Song[]{
        return Object.values(this.list);
    }

    static find(name: string): Song[]{
        const exact = [];
        const result = [];
        name = name.toLowerCase();
        for(const id in this.list){
            const song = this.list[id];
            const lowerName = song.name.toLowerCase();
            if(lowerName.includes(name)){
                result.push(song);
            }
            if(lowerName === name){
                exact.push(song);
            }
        }
        return exact.length > 0 ? exact : result;
    }

    static findByDLC(name: string, dlc: DLC): Song[]{
        const exact = [];
        const result = [];
        name = name.toLowerCase();
        for(const id in this.list){
            const song = this.list[id];
            const lowerName = song.name.toLowerCase();
            if(lowerName.includes(name) && DLC.equals(song.dlc, dlc)){
                result.push(song);
            }
            if(lowerName === name && DLC.equals(song.dlc, dlc)){
                exact.push(song);
            }
        }
        return exact.length > 0 ? exact : result;
    }

    static findByComposer(name: string, composer: string): Song[]{
        const exact = [];
        const result = [];
        name = name.toLowerCase();
        composer = composer.toLowerCase();
        for(const id in this.list){
            const song = this.list[id];
            const lowerName = song.name.toLowerCase();
            const lowerComposer = song.composer.toLowerCase();
            if(lowerName.includes(name) && lowerComposer === composer){
                result.push(song);
            }
            if(lowerName === name && lowerComposer === composer){
                exact.push(song);
            }
        }
        return exact.length > 0 ? exact : result;
    }

    static findByESTi(name: string): Song[]{
        const exact = [];
        const result = [];
        name = name.toLowerCase();
        for(const id in this.list){
            const song = this.list[id];
            const lowerName = song.name.toLowerCase();
            if(lowerName.includes(name) && (song.dlc.dlcCode === 'ESTI' || song.composer === 'ESTi')){
                result.push(song);
            }
            if(lowerName === name && (song.dlc.dlcCode === 'ESTI' || song.composer === 'ESTi')){
                exact.push(song);
            }
        }
        return exact.length > 0 ? exact : result;
    }
}