import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SettingsRoutingModule } from './settings-routing.module';
import { SettingsComponent } from './settings/settings.component';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CropperModule } from '@deer-inc/ngx-croppie';
import { DeleteDialogComponent } from './delete-dialog/delete-dialog.component';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule } from '@angular/material/dialog';
import { AccountComponent } from './account/account.component';
import { MatListModule } from '@angular/material/list';
import { NotificationsComponent } from './notifications/notifications.component';
import { ProfileComponent } from './profile/profile.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PrivacyComponent } from './privacy/privacy.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@NgModule({
  declarations: [
    SettingsComponent,
    DeleteDialogComponent,
    AccountComponent,
    NotificationsComponent,
    ProfileComponent,
    PrivacyComponent,
  ],
  imports: [
    CommonModule,
    SettingsRoutingModule,
    MatButtonModule,
    MatFormFieldModule,
    CropperModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatDividerModule,
    MatDialogModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatSlideToggleModule,
  ],
})
export class SettingsModule {}
