import { CommonModule } from "@angular/common";

import { AdminNavbarComponent } from "./admin-navbar/admin-navbar.component";
import { NgModule } from "@angular/core";
import { UserListComponent } from "./user-list/user-list.component";
import { MapComponent } from "./map/map.component";
import { HomeComponent } from "./home/home.component";
import { HistoryCallComponent } from "./history-call/history-call.component";

@NgModule({
    declarations: [],
    imports: [
         CommonModule,
         AdminNavbarComponent,
         UserListComponent,
         MapComponent,
         HomeComponent,
         HistoryCallComponent
    ]
})
export class AdminModule{

}