import { defineStore } from 'pinia';

const validStatuses: Array<string> = "nologged logged login register".split(' ');

export const useAuthStore = defineStore("auth", {
    state: (): {isAuth: boolean, token: string, email: string, page: string} => {
        return { isAuth: false, token: '', email: '', page: 'nologged'};
    },
    actions: {
        setStatus(newStatus: string): void {
            if (!validStatuses.includes(newStatus))
                return;
            this.page = newStatus;
        }
    }
})
