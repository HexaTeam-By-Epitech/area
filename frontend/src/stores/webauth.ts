import { defineStore } from 'pinia';

const validStatuses: Array<string> = "nologged login register waitingcode logged".split(' ');

const useAuthStore = defineStore("auth", {
    state: (): {accessToken: string, email: string, userId: string, page: string} => {
        // Load from localStorage on initialization
        const savedToken = localStorage.getItem('accessToken') || '';
        const savedEmail = localStorage.getItem('email') || '';
        const savedUserId = localStorage.getItem('userId') || '';
        const page = savedToken ? 'logged' : 'nologged';

        return {
            accessToken: savedToken,
            email: savedEmail,
            userId: savedUserId,
            page
        };
    },
    actions: {
        setPage(newPage: string): void {
            if (!validStatuses.includes(newPage))
                return;
            this.page = newPage;
        },
        login(email: string, accessToken: string, userId: string): void {
            this.email = email;
            this.accessToken = accessToken;
            this.userId = userId;
            this.setPage("logged");

            // Persist to localStorage
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('email', email);
            localStorage.setItem('userId', userId);
        },
        logout(): void {
            this.email = '';
            this.accessToken = '';
            this.userId = '';
            this.setPage("nologged");

            // Clear localStorage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('email');
            localStorage.removeItem('userId');
        },
        isAuth(): boolean {
            return !!this.accessToken;
        },
        getToken(): string {
            return this.accessToken;
        }
    }
})

export default useAuthStore;
