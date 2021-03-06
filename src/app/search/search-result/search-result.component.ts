import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { SearchIndex } from 'functions/node_modules/algoliasearch';
import { Observable } from 'rxjs';
import { fade } from 'src/app/animations/animations';
import { Event } from 'src/app/interfaces/event';
import { User } from 'src/app/interfaces/user';
import { AuthService } from 'src/app/services/auth.service';
import { EventService } from 'src/app/services/event.service';
import { SearchService } from 'src/app/services/search.service';
import { UiService } from 'src/app/services/ui.service';
import { EventDetailDialogComponent } from 'src/app/shared/event-detail-dialog/event-detail-dialog.component';

@Component({
  selector: 'app-search-result',
  templateUrl: './search-result.component.html',
  styleUrls: ['./search-result.component.scss'],
  animations: [fade],
})
export class SearchResultComponent implements OnInit {
  @Input() result: {
    nbHits: number;
    hits: any[];
  };
  user$: Observable<User> = this.authService.user$;
  uid: string;

  events: Event[];
  searchQuery: string;
  searchControl: FormControl = new FormControl();
  index: SearchIndex = this.searchService.index.events;
  loading: boolean;
  type: string;

  private page = 0;
  private maxPage: number;
  private requestOptions: any = {};
  private isInit = true;

  constructor(
    private searchService: SearchService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private authService: AuthService,
    private uiService: UiService,
    private router: Router,
    private eventService: EventService
  ) {}

  ngOnInit(): void {
    this.user$.subscribe((user) => {
      this.uid = user?.uid;
    });
    this.route.queryParamMap.subscribe((params) => {
      this.events = [];
      this.searchQuery = params.get('searchQuery' || '');
      this.requestOptions = {
        page: 0,
        hitsPerPage: 20,
      };
      this.searchEvents();
      this.isInit = false;
    });
  }

  searchEvents() {
    const searchOptions = { ...this.requestOptions };
    this.loading = true;
    if (!this.maxPage || this.maxPage > this.page) {
      this.requestOptions.page++;
      this.loading = true;
      setTimeout(
        () => {
          this.index
            .search(this.searchQuery, searchOptions)
            .then((result) => {
              this.maxPage = result.nbPages;
              this.result = result;
              this.events.push(...(result.hits as any[]));
            })
            .then(() => (this.isInit = false))
            .finally(() => (this.loading = false));
        },
        this.isInit ? 0 : 1000
      );
    }
  }

  openDetailDialog(event: Event): void {
    this.uiService.dialogType = 'search';

    this.dialog.open(EventDetailDialogComponent, {
      panelClass: 'event-detail-dialog',
      data: {
        event,
        uid: this.uid,
        type: this.uiService.dialogType,
      },
    });
  }

  navigateDetail(event: Event) {
    this.router.navigateByUrl(`/event/${event.eventId}`);
  }

  joinChannel(event: Event): void {
    if (event.startAt < this.eventService.dateNow) {
      this.router.navigateByUrl(`/event/${event.eventId}/${this.uid}`);
    } else {
      this.navigateDetail(event);
    }
  }
}
