import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { developerAccessGuard } from './developer-access-guard';

describe('developerAccessGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => developerAccessGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
