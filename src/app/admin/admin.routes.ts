import { Routes } from "@angular/router";
import { HomeComponent } from "./home/home.component";
import { MapComponent } from "./map/map.component";
import { HistoryCallComponent } from "./history-call/history-call.component";
import { UserListComponent } from "./user-list/user-list.component";


export const AdminRoutes: Routes = [
    {
       path:'',
       component: HomeComponent,
       title:'',
    },
    {
        path:'map',
        component: MapComponent,
        title:'',
     },
     {
        path:'history-call',
        component: HistoryCallComponent,
        title:'',
     }
     ,
     {
        path:'user-list',
        component: UserListComponent,
        title:'',
     }

];