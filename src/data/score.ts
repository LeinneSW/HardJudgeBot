import { Difficulty } from "./difficulty";
import { Song, SongFactory } from "./song";

export class SongScore{
    constructor(
        public readonly rate: number,
        public readonly maxCombo: boolean
    ){}

    static NULL(): SongScore{
        return new SongScore(0, false);
    }

    toString(): string{
        let output = `${this.rate}%`;
        if(this.rate > 99.99){
            output += ' (P)';
        }else if(this.maxCombo){
            output += ' (FC)';
        }
        return output
    }
}

export class ScoreManager{
    private static score: SongScore[][][] = [];

    static init(){
        for(const song of SongFactory.getAll()){
            this.score[song.id] = [];
            for(let btn = 0; btn < 4; ++btn){
                this.score[song.id][btn] = [];
                for(let pattern = 0; pattern < 4; ++pattern){
                    this.score[song.id][btn][pattern] = SongScore.NULL();
                }
            }
        }
    }

    static getScore(song: Song | number, difficulty: Difficulty): SongScore{
        if(typeof song !== "object"){
            song = SongFactory.get(song);
        }
        if(!song || !song.havePattern(difficulty)){
            return SongScore.NULL();
        }
        return this.score[song.id][Math.min(difficulty.button - 4, 3)][difficulty.pattern];
    }

    static setScore(song: Song | number, difficulty: Difficulty, rate: number, maxCombo: boolean): SongScore{
        if(typeof song !== "object"){
            song = SongFactory.get(song);
        }
        if(!song || !song.havePattern(difficulty)){
            return SongScore.NULL();
        }

        return this.score[song.id][Math.min(difficulty.button - 4, 3)][difficulty.pattern] = new SongScore(rate, maxCombo);
    }
}