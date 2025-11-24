import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material.module';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.scss'],
})
export class TermsComponent {
  title = 'Условия';
}
