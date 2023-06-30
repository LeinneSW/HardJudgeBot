export class DLC{
    private static full: string[] = [];
    private static dlcCode: string[] = [];

    static addDefault(dlc: DLC): void{
        if(!dlc.dlcCode || this.dlcCode.includes(dlc.dlcCode)){
            return;
        }

        this.full.push(dlc.dlc);
        this.dlcCode.push(dlc.dlcCode);
    }

    static parse(dlc: string): DLC | null{
        dlc = dlc.toUpperCase();
        let index = this.dlcCode.indexOf(dlc);
        if(index < 0){
            index = this.full.indexOf(dlc);
            if(index >= 0){
                return new DLC(this.full[index]);
            }
            return null;
        }
        return new DLC(this.full[index], this.dlcCode[index]);
    }

    static equals(a: DLC, b: DLC): boolean{
        return a.dlc === b.dlc && (!a.dlcCode || !b.dlcCode || a.dlcCode === b.dlcCode)
    }

    constructor(
        public readonly dlc: string,
        public readonly dlcCode?: string
    ){}

    toString(): string{
        return this.dlcCode || this.dlc;
    }
}