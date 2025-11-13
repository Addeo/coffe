import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { NgFor, NgIf, NgOptimizedImage, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { OrganizationsService } from '../../services/organizations.service';
import { AuthService } from '../../services/auth.service';

interface PartnerInfo {
  readonly name: string;
  readonly industry: string;
  readonly description: string;
}

interface IndustrySnapshot {
  readonly name: string;
  readonly summary: string;
  readonly keyMetric: string;
}

interface StabilityHighlight {
  readonly title: string;
  readonly detail: string;
}

interface GalleryItem {
  readonly src: string;
  readonly alt: string;
  readonly caption: string;
}

interface WorkProcessStep {
  readonly step: number;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}

interface Advantage {
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}

interface Statistic {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

@Component({
  standalone: true,
  selector: 'app-company-info',
  imports: [NgIf, NgFor, RouterLink, NgOptimizedImage, CommonModule],
  templateUrl: './company-info.component.html',
  styleUrls: ['./company-info.component.scss'],
})
export class CompanyInfoComponent implements OnInit, OnDestroy {
  private organizationsService = inject(OrganizationsService);
  private authService = inject(AuthService);

  readonly companyName = 'CoffeeCare Юг';
  readonly officeLocation = 'Пятигорск';
  readonly mission =
    'Мы — небольшая частная команда из Пятигорска с многолетним надежным опытом. Выезжаем по кофейням, офисам и автозаправкам по КМВ, Ставропольскому краю и ближайшим республикам, чтобы кофемашины работали стабильно и приносили прибыль владельцам.';
  readonly valueProposition = [
    'Чиним и обслуживаем только кофемашины: профессиональные, автоматические и рожковые — от Astoria до Philips.',
    'Выезжаем по заявке по КМВ, Ставропольскому краю и ближайшим республикам в течение 2–4 часов.',
    'Держим склад расходников, фильтров и уплотнителей в Пятигорске — закрываем 82% заявок за один визит.',
    'После ремонта оставляем фотоотчет, рекомендации по уходу и напоминание о следующем ТО.',
    'Многолетний надежный опыт работы с кофейным оборудованием.',
  ];

  readonly partners = signal<PartnerInfo[]>([]);
  readonly isLoadingPartners = signal(false);

  readonly industries: IndustrySnapshot[] = [
    {
      name: 'Кофейни и обжарщики',
      summary: 'Полная поддержка кофейных баров: от настройки помола и рецептур до замены бойлеров и паровых кранов.',
      keyMetric: 'Среднее восстановление работоспособности — 2 часа 15 минут.',
    },
    {
      name: 'HoReCa и гостиницы',
      summary: 'Составляем график ТО с учетом загрузки, обеспечиваем резервные аппараты и обучаем персонал дневной чистке.',
      keyMetric: '93% заказов закрываем без снятия машины с линии.',
    },
    {
      name: 'Офисы и коворкинги',
      summary: 'Настраиваем кофейные зоны для сотрудников, обеспечиваем расходники и удаленный контроль состояния фильтров.',
      keyMetric: 'Экономия до 28% на расходных материалах за счет профилактики.',
    },
    {
      name: 'АЗС и мини-маркеты',
      summary: 'Следим за чистотой гидросистем на точках с высокой проходимостью, оперативно выезжаем ночью и в праздники.',
      keyMetric: 'Простой кофейной точки — не более 4 часов в пиковые дни.',
    },
  ];

  readonly stabilityHighlights: StabilityHighlight[] = [
    {
      title: 'Главный офис в Пятигорске',
      detail: 'Наш главный офис находится в Пятигорске. Отсюда мы координируем выезды по всему КМВ, Ставропольскому краю и ближайшим республикам.',
    },
    {
      title: 'Многолетний надежный опыт',
      detail: 'Работаем с кофейным оборудованием много лет. Знаем особенности каждого аппарата и умеем быстро находить решения.',
    },
    {
      title: 'Свой склад запчастей',
      detail: 'Храним бойлеры, прокладки, фильтры и краны под популярные модели в нашем складе в Пятигорске. За ними не нужно ждать доставки из других городов.',
    },
    {
      title: 'Регламентные осмотры',
      detail: 'Напоминаем о профилактике, ведем историю каждой машины и говорим, что нужно поменять до того, как она остановится.',
    },
    {
      title: 'Прозрачные условия',
      detail: 'Фиксированные тарифы, акты в день визита и единый контакт владельца — без call-центров и менеджеров.',
    },
  ];

  readonly gallery: GalleryItem[] = [
    {
      src: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=960&q=80',
      alt: 'Инженер разбирает кофемашину в кофейне',
      caption: 'Выездной ремонт прямо на точке — большинство неисправностей закрываем за один визит.',
    },
    {
      src: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=960&q=80',
      alt: 'Склад запчастей и расходников для кофемашин',
      caption: 'Собственный склад в Пятигорске: бойлеры, фильтры, помпы и детали паровых кранов.',
    },
    {
      src: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=960&q=80',
      alt: 'Бариста готовит кофе после сервисного обслуживания',
      caption: 'После обслуживания обучаем персонал ежедневной чистке и записи параметров, чтобы техника служила дольше.',
    },
    {
      src: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?auto=format&fit=crop&w=960&q=80',
      alt: 'Кофемашина в работе после ремонта',
      caption: 'Профессиональный ремонт и настройка кофемашин для стабильной работы.',
    },
    {
      src: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=960&q=80',
      alt: 'Мастер проводит диагностику кофемашины',
      caption: 'Точная диагностика и выявление проблем на ранней стадии.',
    },
    {
      src: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=960&q=80',
      alt: 'Чистка и профилактика кофемашины',
      caption: 'Регулярная профилактика и чистка продлевают срок службы оборудования.',
    },
    {
      src: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=960&q=80',
      alt: 'Обучение персонала работе с кофемашиной',
      caption: 'Обучаем персонал правильному уходу за кофемашинами.',
    },
    {
      src: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=960&q=80',
      alt: 'Замена запчастей в кофемашине',
      caption: 'Используем только оригинальные запчасти для надежной работы.',
    },
  ];

  readonly workProcessSteps: WorkProcessStep[] = [
    {
      step: 1,
      title: 'Оставляете заявку',
      description: 'Связываетесь с нами по телефону, email или через форму на сайте. Описываете проблему или запрашиваете профилактику.',
      icon: '📞',
    },
    {
      step: 2,
      title: 'Согласовываем время',
      description: 'Договариваемся о удобном времени визита. Обычно выезжаем в течение 2–4 часов после обращения.',
      icon: '📅',
    },
    {
      step: 3,
      title: 'Выезд мастера',
      description: 'Мастер приезжает с необходимым инструментом и запчастями. Проводит диагностику и устраняет проблему.',
      icon: '🔧',
    },
    {
      step: 4,
      title: 'Ремонт и обслуживание',
      description: 'Выполняем ремонт, замену запчастей, чистку и настройку. Обучаем персонал правильному уходу.',
      icon: '⚙️',
    },
    {
      step: 5,
      title: 'Отчет и рекомендации',
      description: 'Оставляем фотоотчет о проделанной работе, рекомендации по уходу и напоминание о следующем ТО.',
      icon: '📋',
    },
  ];

  readonly advantages: Advantage[] = [
    {
      title: 'Быстрое реагирование',
      description: 'Выезжаем в течение 2–4 часов после обращения. Работаем в будни, выходные и праздники.',
      icon: '⚡',
    },
    {
      title: 'Оригинальные запчасти',
      description: 'Используем только оригинальные запчасти от производителей. Держим склад в Пятигорске.',
      icon: '✅',
    },
    {
      title: 'Опытные мастера',
      description: 'Многолетний опыт работы с кофейным оборудованием. Знаем особенности каждой модели.',
      icon: '👨‍🔧',
    },
    {
      title: 'Прозрачные цены',
      description: 'Фиксированные тарифы без скрытых доплат. Озвучиваем стоимость до начала работ.',
      icon: '💰',
    },
    {
      title: 'Гарантия на работы',
      description: 'Предоставляем гарантию на все виды работ и установленные запчасти.',
      icon: '🛡️',
    },
    {
      title: 'История обслуживания',
      description: 'Ведем полную историю обслуживания каждой кофемашины. Помним особенности вашего оборудования.',
      icon: '📊',
    },
  ];

  readonly statistics: Statistic[] = [
    {
      value: '82%',
      label: 'Заявок закрываем за один визит',
      description: 'Благодаря собственному складу запчастей',
    },
    {
      value: '2–4 часа',
      label: 'Среднее время выезда',
      description: 'После получения заявки',
    },
    {
      value: '10+ лет',
      label: 'Опыта работы',
      description: 'С кофейным оборудованием',
    },
    {
      value: '93%',
      label: 'Заказов без снятия с линии',
      description: 'Ремонт прямо на точке',
    },
  ];

  readonly currentSlideIndex = signal(0);
  readonly contactEmail = 'info@coffeecare-yug.ru';
  readonly contactPhone = '+7 (879) 333-XX-XX';
  private carouselInterval?: number;
  private isCarouselPaused = false;
  private carouselPauseTimeout?: number;

  ngOnInit(): void {
    this.loadOrganizations();
    this.setupScrollAnimations();
    this.startCarouselAutoRotate();
  }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
    if (this.carouselPauseTimeout) {
      clearTimeout(this.carouselPauseTimeout);
    }
  }

  private startCarouselAutoRotate(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
    this.carouselInterval = window.setInterval(() => {
      if (!this.isCarouselPaused) {
        const current = this.currentSlideIndex();
        const next = (current + 1) % this.gallery.length;
        this.currentSlideIndex.set(next);
      }
    }, 5000);
  }

  private pauseCarouselTemporarily(): void {
    this.isCarouselPaused = true;
    if (this.carouselPauseTimeout) {
      clearTimeout(this.carouselPauseTimeout);
    }
    // Resume after 10 seconds of inactivity
    this.carouselPauseTimeout = window.setTimeout(() => {
      this.isCarouselPaused = false;
    }, 10000);
  }

  private loadOrganizations(): void {
    // Only load organizations if user is authenticated
    // This is a public page, so we don't want to trigger auth redirects
    if (!this.authService.isAuthenticated()) {
      // Use default partners for unauthenticated users
      this.partners.set(this.getDefaultPartners());
      this.isLoadingPartners.set(false);
      return;
    }

    this.isLoadingPartners.set(true);
    this.organizationsService.getOrganizations({ isActive: true, limit: 100 }).subscribe({
      next: response => {
        const organizations = response.data || [];
        const partnersData: PartnerInfo[] = organizations.slice(0, 8).map(org => ({
          name: org.name,
          industry: this.getIndustryType(org.name),
          description: this.getOrganizationDescription(org.name),
        }));
        this.partners.set(partnersData);
        this.isLoadingPartners.set(false);
      },
      error: error => {
        console.error('Failed to load organizations:', error);
        // Fallback to default partners if API fails
        this.partners.set(this.getDefaultPartners());
        this.isLoadingPartners.set(false);
      },
    });
  }

  private getDefaultPartners(): PartnerInfo[] {
    return [
      {
        name: 'Кофейня «Эспрессо»',
        industry: 'Пятигорск · Кофейня',
        description: 'Регулярное обслуживание и настройка кофемашин. Стабильная работа без простоев.',
      },
      {
        name: 'Гостиница «Пятигорск»',
        industry: 'Пятигорск · HoReCa',
        description: 'Поддерживаем кофейные станции в номерах и ресторанах. Быстрое реагирование на заявки.',
      },
      {
        name: 'АЗС «Лукойл»',
        industry: 'КМВ · Автозаправки',
        description: 'Обслуживание кофейных автоматов на нескольких точках. График профилактики.',
      },
      {
        name: 'Офисный центр «Кавказ»',
        industry: 'Кисловодск · Офисы',
        description: 'Настройка кофейных зон для сотрудников. Обеспечение расходными материалами.',
      },
    ];
  }

  private getIndustryType(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('кофейн') || lowerName.includes('кафе')) {
      return 'Кофейня';
    }
    if (lowerName.includes('гостиниц') || lowerName.includes('отель')) {
      return 'HoReCa';
    }
    if (lowerName.includes('азс') || lowerName.includes('заправк')) {
      return 'Автозаправка';
    }
    if (lowerName.includes('офис') || lowerName.includes('коворкинг')) {
      return 'Офисы';
    }
    return 'Бизнес';
  }

  private getOrganizationDescription(name: string): string {
    return `Доверяют нам обслуживание своего кофейного оборудования. Обеспечиваем стабильную работу и быстрое реагирование на заявки.`;
  }

  private setupScrollAnimations(): void {
    // Intersection Observer для scroll animations
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        const observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Stop observing once visible for performance
                observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.15, rootMargin: '0px 0px -80px 0px' }
        );

        // Wait for view initialization
        setTimeout(() => {
          const hostElement = document.querySelector('app-company-info');
          if (hostElement) {
            const sections = hostElement.querySelectorAll('section');
            sections.forEach((section, index) => {
              // Add staggered delay for better visual effect
              section.setAttribute('data-animation-delay', (index * 100).toString());
              observer.observe(section);
            });
          }
        }, 200);
      });
    }
  }

  nextSlide(): void {
    this.pauseCarouselTemporarily();
    const current = this.currentSlideIndex();
    const next = (current + 1) % this.gallery.length;
    this.currentSlideIndex.set(next);
  }

  prevSlide(): void {
    this.pauseCarouselTemporarily();
    const current = this.currentSlideIndex();
    const prev = current === 0 ? this.gallery.length - 1 : current - 1;
    this.currentSlideIndex.set(prev);
  }

  goToSlide(index: number): void {
    this.pauseCarouselTemporarily();
    this.currentSlideIndex.set(index);
  }

  onCarouselMouseEnter(): void {
    this.isCarouselPaused = true;
  }

  onCarouselMouseLeave(): void {
    this.isCarouselPaused = false;
  }

  getPhoneHref(phone: string): string {
    return `tel:${phone.replace(/\s/g, '').replace(/[()]/g, '')}`;
  }

  readonly trackValue = (_: number, value: string) => value;

  readonly trackPartner = (_: number, partner: PartnerInfo) => partner.name;

  readonly trackIndustry = (_: number, industry: IndustrySnapshot) => industry.name;

  readonly trackHighlight = (_: number, highlight: StabilityHighlight) => highlight.title;

  readonly trackGallery = (_: number, item: GalleryItem) => item.src;

  readonly trackWorkProcess = (_: number, step: WorkProcessStep) => step.step;

  readonly trackAdvantage = (_: number, advantage: Advantage) => advantage.title;

  readonly trackStatistic = (_: number, statistic: Statistic) => statistic.value;
}

