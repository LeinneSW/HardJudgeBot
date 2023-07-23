import { JSONData } from "../utils/utils";

export class User{
    static readonly CONSOLE: User = new User(0, 'console', 'console', true, true);

    static parse(data: JSONData): User{
        return new User(
            parseInt(data['user-id']),
            data.username,
            data['display-name'],
            data.mod || data.badges?.broadcaster === '1',
            data.badges?.broadcaster === '1'
        );
    }

    private constructor(
        public readonly id: number,
        public readonly username: string,
        public readonly nickname: string,
        public readonly moderator: boolean,
        public readonly broadcaster: boolean,
    ){}

    isConsole(): boolean{
        return this.id === 0 && this.username === 'console';
    }

    getFullName(): string{
        return `${this.nickname}(${this.username})`;
    }
}