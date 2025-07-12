import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeDiff',
})
export class TimeDiffPipe implements PipeTransform {
  transform(value: number): string {
    if (!value) return 'Never';

    const seconds = Math.floor((+new Date() - value) / 1000);
    const interval = seconds / 31536000;

    if (interval > 1) {
      return (
        Math.floor(interval) +
        ' year' +
        (Math.floor(interval) > 1 ? 's' : '') +
        ' ago'
      );
    }
    if (interval > 0.0833333) {
      return (
        Math.floor(interval * 12) +
        ' month' +
        (Math.floor(interval * 12) > 1 ? 's' : '') +
        ' ago'
      );
    }
    if (interval > 0.00277778) {
      return (
        Math.floor(interval * 365) +
        ' day' +
        (Math.floor(interval * 365) > 1 ? 's' : '') +
        ' ago'
      );
    }
    if (interval > 0.000114155) {
      return (
        Math.floor(interval * 8760) +
        ' hour' +
        (Math.floor(interval * 8760) > 1 ? 's' : '') +
        ' ago'
      );
    }
    if (interval > 0.00000190259) {
      return (
        Math.floor(interval * 525600) +
        ' minute' +
        (Math.floor(interval * 525600) > 1 ? 's' : '') +
        ' ago'
      );
    }
    return (
      Math.floor(interval * 31536000) +
      ' second' +
      (Math.floor(interval * 31536000) > 1 ? 's' : '') +
      ' ago'
    );
  }
}
