import { Component } from '@angular/core';
import { LoadingService } from '../core/laoding.service';

@Component({
  selector: 'app-loading-autgate',
  imports: [],
  templateUrl: './loading-autgate.html',
  styleUrl: './loading-autgate.scss',
})
export class LoadingAutgate {
  loading$;

  constructor(private loadingService: LoadingService) {
    this.loading$ = this.loadingService.loading$;
  }
}
