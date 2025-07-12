// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('firebase-messaging-sw.js')
        .then((registration) => {
          console.log(
            '✅ Service Worker registered with scope:',
            registration.scope
          );
        })
        .catch((err) => {
          console.error('❌ Service Worker registration failed:', err);
        });
    }
  })
  .catch((err) => console.error(err));
