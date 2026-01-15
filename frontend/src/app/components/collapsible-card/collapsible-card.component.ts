import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal, effect, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-collapsible-card',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './collapsible-card.component.html',
  styleUrls: ['./collapsible-card.component.scss'],
})
export class CollapsibleCardComponent implements OnInit {
  @Input() title = '';
  @Input() icon?: string;
  @Input() subtitle?: string;
  @Input() collapsible = true;
  @Input() defaultCollapsed = false;
  @Input() toggleOnHeaderClick = true;
  @Input() useProjectedTitle = false;
  @Input() toggleTooltipCollapsed = '';
  @Input() toggleTooltipExpanded = '';
  @Input() toggleAriaLabelCollapsed = '';
  @Input() toggleAriaLabelExpanded = '';

  @Output() collapsedChange = new EventEmitter<boolean>();

  private hasExternalControl = signal(false);
  private externalCollapsedValue = signal<boolean | null | undefined>(null);
  collapsedState = signal(false);

  constructor() {
    effect(() => {
      const externalValue = this.externalCollapsedValue();
      if (externalValue !== null && externalValue !== undefined) {
        this.hasExternalControl.set(true);
        this.collapsedState.set(externalValue);
      }
    });
  }

  @Input()
  set collapsed(value: boolean | null | undefined) {
    this.externalCollapsedValue.set(value);
  }

  ngOnInit(): void {
    if (!this.hasExternalControl()) {
      this.collapsedState.set(this.defaultCollapsed);
    }
  }

  onToggle(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!this.collapsible) {
      return;
    }
    const nextState = !this.collapsedState();
    if (!this.hasExternalControl()) {
      this.collapsedState.set(nextState);
    }
    this.collapsedChange.emit(nextState);
  }
}
