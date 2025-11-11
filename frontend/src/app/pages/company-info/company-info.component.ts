import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgFor, NgIf, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

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

@Component({
  standalone: true,
  selector: 'app-company-info',
  imports: [NgIf, NgFor, RouterLink, NgOptimizedImage],
  templateUrl: './company-info.component.html',
  styleUrls: ['./company-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanyInfoComponent {
  readonly companyName = 'CoffeeCare Юг';
  readonly mission =
    'Мы — небольшая частная команда из Ростова-на-Дону. Уже десять лет выезжаем по кофейням, офисам и автозаправкам Южного федерального округа, чтобы кофемашины работали стабильно и приносили прибыль владельцам.';
  readonly valueProposition = [
    'Чиним и обслуживаем только кофемашины: профессиональные, автоматические и рожковые — от Astoria до Philips.',
    'Выезжаем по заявке в Ростове, Краснодаре, Сочи, Новороссийске и Ставрополе в течение 2–4 часов.',
    'Держим склад расходников, фильтров и уплотнителей — закрываем 82% заявок за один визит.',
    'После ремонта оставляем фотоотчет, рекомендации по уходу и напоминание о следующем ТО.',
  ];
  readonly partners: PartnerInfo[] = [
    {
      name: 'Сеть кофеен «Южный вкус»',
      industry: 'Ростов-на-Дону · 18 точек',
      description:
        'Еженедельная профилактика, настройка рецептур и обучение бариста базовой диагностике. Сеть не простаивает даже в выходные.',
    },
    {
      name: 'Гостиница «Южный Ветер»',
      industry: 'Сочи · HoReCa',
      description:
        'Поддерживаем кофейные станции на завтраках и в лобби. Держим комплект критичных запчастей прямо у клиента, чтобы реагировать до 6 утра.',
    },
    {
      name: 'АЗС «Дельта»',
      industry: 'Краснодарский край · сеть автозаправок',
      description:
        'Настроили график профилактики и удаленный мониторинг водоподготовки для 27 точек — капучино стабильный, очереди меньше.',
    },
    {
      name: 'Коворкинг «Точка встречи»',
      industry: 'Ставрополь · офисные пространства',
      description:
        'Закрепили фиксированную ставку обслуживания, обучили администраторов по ежедневной чистке и снизили обращения в три раза.',
    },
  ];

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
      title: 'Локальные мастера',
      detail: 'В команде 6 инженеров — жители Ростова, Краснодара и Сочи. Мы знаем короткие дороги и клиентов по именам.',
    },
    {
      title: 'Свой склад запчастей',
      detail: 'Храним бойлеры, прокладки, фильтры и краны под популярные модели. За ними не нужно ждать доставки из Москвы.',
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
      caption: 'Собственный склад в Ростове-на-Дону: бойлеры, фильтры, помпы и детали паровых кранов.',
    },
    {
      src: 'https://images.unsplash.com/photo-1504753793650-d4a2b783c15e?auto=format&fit=crop&w=960&q=80',
      alt: 'Бариста готовит кофе после сервисного обслуживания',
      caption: 'После обслуживания обучаем персонал ежедневной чистке и записи параметров, чтобы техника служила дольше.',
    },
  ];

  readonly trackValue = (_: number, value: string) => value;

  readonly trackPartner = (_: number, partner: PartnerInfo) => partner.name;

  readonly trackIndustry = (_: number, industry: IndustrySnapshot) => industry.name;

  readonly trackHighlight = (_: number, highlight: StabilityHighlight) => highlight.title;

  readonly trackGallery = (_: number, item: GalleryItem) => item.src;
}

