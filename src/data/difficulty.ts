export class Difficulty{
    private static smallStr = [
        "NM",
        "HD",
        "MX",
        "SC"
    ];
    private static largeStr = [
        "NORMAL",
        "HARD",
        "MAXIMUM",
        "SC"
    ];
    
    private constructor(
        public readonly button: number,
        public readonly pattern: number,
    ){}

    toString(large?: boolean): string{
        return large ? Difficulty.largeStr[this.pattern] : Difficulty.smallStr[this.pattern];
    }

    toStringButton(): string{
        return `${this.button}${Difficulty.smallStr[this.pattern]}`;
    }

    static parse(difficulty: string): Difficulty | null;
    static parse(button: number, pattern: string): Difficulty | null;

    static parse(button: string | number, pattern?: string): Difficulty | null{
        if(typeof button == "string"){
            pattern = button.substring(1);
            button = parseInt(button[0]);
        }else if(!pattern){
            return null;
        }

        if(![4, 5, 6, 8].includes(button)){
            return null;
        }

        pattern = pattern.toUpperCase();
        let index = this.smallStr.indexOf(pattern);
        if(index < 0){
            index = this.largeStr.indexOf(pattern);
        }
        if(index < 0){
            return null;
        }
        return new Difficulty(button, index);
    }
}