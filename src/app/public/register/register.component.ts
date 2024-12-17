import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {

  registerForm = new FormGroup ({
    email: new FormControl('',Validators.required),
    password: new FormControl('', Validators.required)
})

register(){
   
}
}
