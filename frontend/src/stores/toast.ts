import { defineStore } from 'pinia';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export const useToastStore = defineStore('toast', {
  state: () => ({
    message: '' as string,
    type: 'info' as ToastType,
    visible: false as boolean,
    timeoutId: null as number | null,
    duration: 3000 as number,
  }),
  actions: {
    show(message: string, type: ToastType = 'info', duration = 3000) {
      this.message = message;
      this.type = type;
      this.visible = true;
      this.duration = duration;

      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
      // Auto-hide after duration
      this.timeoutId = (setTimeout(() => {
        this.hide();
      }, duration) as unknown) as number;
    },
    hide() {
      this.visible = false;
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }
    },
  },
});

export default useToastStore;

