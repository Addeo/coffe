import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { httpRequestInterceptor } from './app/interceptors/http.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([httpRequestInterceptor, authInterceptor])),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
  ],
}).catch(err => console.error(err));
