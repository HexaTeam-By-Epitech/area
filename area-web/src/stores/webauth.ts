import { defineStore } from 'pinia';

const validStatuses: Array<string> = "nologged login register".split(' ');

const useAuthStore = defineStore("auth", {
    state: (): {token: string, email: string, page: string} => {
        return {token: '', email: '', page: 'nologged'};
    },
    actions: {
        setPage(newPage: string): void {
            if (!validStatuses.includes(newPage))
                return;
            this.page = newPage;
        },
        login(email: string, token: string): void {
            this.email = email;
            this.token = token;
        },
        logout(): void {
            this.email = '';
            this.token = '';
        },
        isAuth(): boolean {
            return !!this.token;
        }

    }
})

export default useAuthStore;
