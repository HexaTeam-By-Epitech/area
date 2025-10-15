import { defineStore } from "pinia";
import { apiDirect as api } from "@/utils/api";

const logo_google = `<svg viewBox="0 0 24 24" width="32" height="32">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>`

const logo_spotify  = `<svg viewBox="0 0 24 24" width="32" height="32">
      <path fill="#1DB954" d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>`

const logo_slack = `<svg viewBox="0 0 24 24" width="32" height="32">
      <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"/>
      <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"/>
      <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"/>
      <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>`

const logo_discord = `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="#5865F2" preserveAspectRatio="xMidYMid">
  <g transform="translate(0,3.56) scale(0.125)">
    <path d="M216.856 16.597A208.5 208.5 0 0 0 164.042 0c-2.275 4.113-4.933 9.645-6.766 14.046q-29.538-4.442-58.533 0c-1.832-4.4-4.55-9.933-6.846-14.046a207.8 207.8 0 0 0-52.855 16.638C5.618 67.147-3.443 116.4 1.087 164.956c22.169 16.555 43.653 26.612 64.775 33.193A161 161 0 0 0 79.735 175.3a136.4 136.4 0 0 1-21.846-10.632 109 109 0 0 0 5.356-4.237c42.122 19.702 87.89 19.702 129.51 0a132 132 0 0 0 5.355 4.237 136 136 0 0 1-21.886 10.653c4.006 8.02 8.638 15.67 13.873 22.848 21.142-6.58 42.646-16.637 64.815-33.213 5.316-56.288-9.08-105.09-38.056-148.36M85.474 135.095c-12.645 0-23.015-11.805-23.015-26.18s10.149-26.2 23.015-26.2 23.236 11.804 23.015 26.2c.02 14.375-10.148 26.18-23.015 26.18m85.051 0c-12.645 0-23.014-11.805-23.014-26.18s10.148-26.2 23.014-26.2c12.867 0 23.236 11.804 23.015 26.2 0 14.375-10.148 26.18-23.015 26.18" />
  </g>
</svg>`

export type Provider = {
    id: number,
    name: string,
    displayName: string,
    linked: boolean,
    loading: boolean,
    logo: string,
    color: string,
    textColor: string
}

const useProvidersStore = defineStore("services", {
    state: (): {providers: Array<Provider>, providerNames: Array<string>, linkedProviders: Array<string>} => {
        const providers: Array<Provider> = [];
        const providerNames: Array<string> = [];
        const linkedProviders: Array<string> = [];

        return {
            providers,
            providerNames,
            linkedProviders
        }
    },
    actions: {
        async fetchProviders() {
            const [providersRes, linkedRes] = await Promise.all([
                api.get('/auth/providers'),
                api.get('/auth/linked-providers')
            ]);

            if (!providersRes.data.providers || !Array.isArray(providersRes.data.providers)) {
                throw new Error("Invalid providers response.");
            }
            if (!linkedRes.data.providers || !Array.isArray(linkedRes.data.providers)) {
                throw new Error("Invalid linked providers response.");
            }

            this.providerNames = providersRes.data.providers;
            this.linkedProviders = linkedRes.data.providers;
        },
        initServices() {
            if (this.providers.length > 0)
                return
            for (let i: number = 0; i < this.providerNames.length; i++) {
                this.providers.push({
                    id: i,
                    name: this.providerNames[i],
                    displayName: this.providerNames[i].charAt(0).toUpperCase() + this.providerNames[i].slice(1),
                    linked: this.linkedProviders.includes(this.providerNames[i]),
                    loading: false,
                    logo: '',
                    color: '#1f1f1f',
                    textColor: '#a2a2a2'
                })
            }
        },
        overrideDefault() {
            for (let index: number = 0; index < this.providers.length; index++){
                switch (this.providers[index].name) {
                    case "google":
                        this.providers[index].logo = logo_google;
                        this.providers[index].color = '#ffffff';
                        this.providers[index].textColor = '#1a1a1a';
                        break

                    case "spotify":
                        this.providers[index].logo = logo_spotify;
                        this.providers[index].color = '#191414';
                        break

                    case "discord":
                        this.providers[index].logo = logo_discord;
                        this.providers[index].color = '#404245';
                        break

                    case "slack":
                        this.providers[index].logo = logo_slack;
                        this.providers[index].color = '#4a154b';
                        break

                    // When a new provider is added into the DB,
                    // you just need to override logo and color

                    default:
                        console.warn(`Provider not found error: Provider '${this.providers[index].name}' has no style override.`)
                        break

                }
            }
        },
        async entryPoint() {
            await this.fetchProviders();
            this.initServices();
            this.overrideDefault();
        }
    }

})

export default useProvidersStore;
