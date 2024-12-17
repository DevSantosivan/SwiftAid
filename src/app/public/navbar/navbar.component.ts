import { Component, OnInit } from '@angular/core';
import { Router,RouterLink } from '@angular/router';
import { LoaderComponent } from '../../loader/loader.component';


@Component({
    selector: 'app-navbar',
    imports: [ LoaderComponent],
    templateUrl: './navbar.component.html',
    styleUrl: './navbar.component.scss'
})
export class NavbarComponent{
   constructor(private route: Router){

   }

   ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    
   }
   navigateToServices(){
    this.isloader = true;
    setTimeout(() => {
      this.route.navigate(['/services']);
      this.isloader = false;
    }, 1000); // Simulating a delay for the loader
   }
   navigateToAboutus() {
    this.isloader = true;
    setTimeout(() => {
      this.route.navigate(['/AboutUs']);
      this.isloader = false;
    }, 1000); // Simulating a delay for the loader
  }
   isloader:boolean = false;

   loader(){
    this.isloader= true;
    setTimeout(()=>{
      this.isloader= false;
      this.route.navigate(['/login'])
     },3000)

  }
}
