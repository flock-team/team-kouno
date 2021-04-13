import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pipes',
})
export class Pipes implements PipeTransform {
  transform(interval: string): unknown {
    switch (interval) {
      case 'day':
        return '毎日';
      case 'week':
        return '毎週';
      case 'month':
        return '毎月';
      case 'year':
        return '毎年';
    }
  }
}
