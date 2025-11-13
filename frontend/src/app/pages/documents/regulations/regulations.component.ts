import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../shared/material/material.module';

@Component({
  selector: 'app-regulations',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './regulations.component.html',
  styleUrls: ['./regulations.component.scss'],
})
export class RegulationsComponent {
  title = 'Регламент';
}

