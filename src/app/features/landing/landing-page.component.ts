import { Component, HostListener, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LANDING_DATA, ProcessStep } from './landing-page.data';
import { RevealDirective } from './reveal.directive';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink, RevealDirective],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent implements OnInit {
  data = LANDING_DATA;
  isScrolled = false;
  activeSection = 'hero';
  isMobileMenuOpen = false;
  
  // Interactive Process State
  activeProcessStep: ProcessStep = this.data.processSteps[0];
  processProgress = 0;
  
  // Diagram Hover State
  hoveredNode: number | null = null;
  
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.checkScroll();
      this.updateProcessProgress();
    }
  }

  setHoveredNode(index: number | null) {
    this.hoveredNode = index;
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (!this.isBrowser) return;
    this.checkScroll();
    this.updateActiveSection();
  }

  private checkScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  private updateActiveSection() {
    const sections = this.data.navItems.map(item => item.sectionId);
    let current = '';

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top <= 150) {
          current = section;
        }
      }
    }
    
    if (current) {
      this.activeSection = current;
    }
  }

  scrollToSection(sectionId: string, event: Event) {
    event.preventDefault();
    this.isMobileMenuOpen = false;
    
    if (!this.isBrowser) return;

    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
  
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  setActiveProcessStep(step: ProcessStep) {
    this.activeProcessStep = step;
    this.updateProcessProgress();
  }
  
  private updateProcessProgress() {
    const index = this.data.processSteps.findIndex(s => s.id === this.activeProcessStep.id);
    const total = this.data.processSteps.length - 1;
    this.processProgress = (index / total) * 100;
  }
}
