import * as fs from 'fs';
import { Song } from "../data/song";

export interface JSONData{
    [key: string]: any;
}

export class SongAliases{
    private static list: JSONData = {};
    static loadData(): void{
        this.list = JSON.parse(fs.readFileSync('./resources/aliases.json', 'utf-8'));
    }

    static getAlias(alias: string): string | null{
        if(alias in this.list){
            return this.list[alias];
        }
        return null;
    }

    static setAlias(alias: string, name: string | Song): string{
        let composer;
        alias = alias.trim();
        if(typeof name === "object" && !composer){
            composer = name.composer;
            name = name.name.toLowerCase();
        }
        this.list[alias] = `${name}${!!composer ? `||${composer}` : ''}`;
        fs.writeFileSync('./resources/aliases.json', JSON.stringify(this.list), 'utf-8');
        return this.list[alias];
    }
}

export class Utils{
    static parseCommand(input: string): string[]{
        const tokens = [];
        let currentToken = '';
        let inQuotes = false;
    
        for(let i = 0; i < input.length; i++){
            const char = input[i];
            if(char === ' ' && !inQuotes){ //다음 명령어 구문
                if(currentToken){
                    tokens.push(currentToken);
                    currentToken = '';
                }
            }else if(char === '"'){
                inQuotes = !inQuotes;
                if(inQuotes && currentToken){
                    tokens.push(currentToken);
                    currentToken = '';
                }
            }else{
                currentToken += char;
            }
        }
        if(currentToken){
            tokens.push(currentToken);
        }
        return tokens;
    }
}