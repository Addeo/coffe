import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AgreementType } from '../../services/agreements.service';

interface AgreementContent {
  type: AgreementType;
  title: string;
  version: string;
  content: string;
  updatedAt: Date;
}

@Component({
  selector: 'app-agreement-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="agreement-view-container">
      <div class="agreement-content">
        <!-- Header -->
        <div class="agreement-header">
          <button mat-icon-button routerLink="/login" class="back-button">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1 class="agreement-title">
            <mat-icon>{{ getTypeIcon(agreement()?.type) }}</mat-icon>
            {{ agreement()?.title || 'Загрузка...' }}
          </h1>
          @if (agreement()) {
            <div class="agreement-meta">
              <span class="version-badge">Версия {{ agreement()!.version }}</span>
              <span class="date-badge">Обновлено: {{ formatDate(agreement()!.updatedAt) }}</span>
            </div>
          }
        </div>

        <!-- Loading -->
        @if (isLoading()) {
          <div class="loading-container">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Загрузка соглашения...</p>
          </div>
        }

        <!-- Error -->
        @if (error()) {
          <mat-card class="error-card">
            <mat-card-content>
              <mat-icon color="warn">error</mat-icon>
              <p>{{ error() }}</p>
              <button mat-raised-button color="primary" routerLink="/login">
                Вернуться на страницу входа
              </button>
            </mat-card-content>
          </mat-card>
        }

        <!-- Agreement Content -->
        @if (agreement() && !isLoading() && !error()) {
          <mat-card class="agreement-card">
            <mat-card-content>
              <div 
                class="agreement-text-content" 
                [innerHTML]="agreement()!.content">
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Footer -->
        <div class="agreement-footer">
          <button mat-raised-button color="primary" routerLink="/login">
            <mat-icon>arrow_back</mat-icon>
            Вернуться на страницу входа
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .agreement-view-container {
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        padding: 20px;
        display: flex;
        justify-content: center;
      }

      .agreement-content {
        max-width: 900px;
        width: 100%;
        background: white;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .agreement-header {
        padding: 32px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(0, 0, 0, 0.02);
      }

      .back-button {
        margin-bottom: 16px;
      }

      .agreement-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 28px;
        font-weight: 600;
        color: #333;
        margin: 0 0 16px 0;

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
          color: #667eea;
        }
      }

      .agreement-meta {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        margin-top: 8px;
      }

      .version-badge,
      .date-badge {
        padding: 4px 12px;
        background: rgba(102, 126, 234, 0.1);
        border-radius: 16px;
        font-size: 12px;
        color: #667eea;
        font-weight: 500;
      }

      .loading-container {
        padding: 64px;
        text-align: center;
        color: #666;

        p {
          margin-top: 16px;
        }
      }

      .error-card {
        margin: 32px;
        text-align: center;

        mat-card-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 32px;

          mat-icon {
            font-size: 48px;
            width: 48px;
            height: 48px;
          }

          p {
            color: #666;
            font-size: 16px;
          }
        }
      }

      .agreement-card {
        margin: 32px;
        box-shadow: none;
        border: 1px solid rgba(0, 0, 0, 0.08);

        mat-card-content {
          padding: 32px;
        }
      }

      .agreement-text-content {
        line-height: 1.8;
        color: #333;
        font-size: 15px;

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          color: #333;
          margin-top: 24px;
          margin-bottom: 12px;
        }

        p {
          margin-bottom: 16px;
        }

        ul,
        ol {
          margin-bottom: 16px;
          padding-left: 24px;
        }

        li {
          margin-bottom: 8px;
        }
      }

      .agreement-footer {
        padding: 24px 32px;
        border-top: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(0, 0, 0, 0.02);
        display: flex;
        justify-content: center;
      }

      @media (max-width: 768px) {
        .agreement-view-container {
          padding: 12px;
        }

        .agreement-header {
          padding: 20px;
        }

        .agreement-title {
          font-size: 22px;
        }

        .agreement-card {
          margin: 16px;
        }

        .agreement-text-content {
          font-size: 14px;
        }
      }
    `,
  ],
})
export class AgreementViewComponent implements OnInit {
  private route = inject(ActivatedRoute);

  agreement = signal<AgreementContent | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Статические тексты соглашений
  private staticAgreements: Map<AgreementType, AgreementContent> = new Map([
    [
      AgreementType.PRIVACY_POLICY,
      {
        type: AgreementType.PRIVACY_POLICY,
        title: 'Политика конфиденциальности',
        version: '1.0',
        updatedAt: new Date('2025-11-19'),
        content: `
          <h2>1. Общие положения</h2>
          <p>Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей системы управления заявками Coffee (далее — «Система»).</p>
          <p>Используя Систему, вы даете согласие на обработку ваших персональных данных в соответствии с настоящей Политикой конфиденциальности.</p>

          <h2>2. Собираемые данные</h2>
          <p>При использовании Системы мы можем собирать следующие данные:</p>
          <ul>
            <li><strong>Персональные данные:</strong> имя, фамилия, электронная почта, номер телефона</li>
            <li><strong>Данные учетной записи:</strong> логин, пароль (в зашифрованном виде), роль пользователя</li>
            <li><strong>Рабочие данные:</strong> информация о заявках, выполненных работах, рабочем времени</li>
            <li><strong>Технические данные:</strong> IP-адрес, тип браузера, данные об устройстве</li>
          </ul>

          <h2>3. Цели обработки данных</h2>
          <p>Персональные данные обрабатываются в следующих целях:</p>
          <ul>
            <li>Предоставление доступа к функционалу Системы</li>
            <li>Управление заявками и учет рабочего времени</li>
            <li>Расчет заработной платы и статистика</li>
            <li>Коммуникация с пользователями</li>
            <li>Улучшение работы Системы</li>
            <li>Обеспечение безопасности и предотвращение мошенничества</li>
          </ul>

          <h2>4. Правовые основания обработки</h2>
          <p>Обработка персональных данных осуществляется на основании:</p>
          <ul>
            <li>Согласия субъекта персональных данных</li>
            <li>Исполнения договора, стороной которого является субъект персональных данных</li>
            <li>Соблюдения требований законодательства Российской Федерации</li>
          </ul>

          <h2>5. Хранение и защита данных</h2>
          <p>Мы принимаем все необходимые организационные и технические меры для защиты персональных данных:</p>
          <ul>
            <li>Использование современных систем шифрования</li>
            <li>Ограничение доступа к персональным данным только авторизованным сотрудникам</li>
            <li>Регулярное обновление систем безопасности</li>
            <li>Резервное копирование данных</li>
          </ul>
          <p>Персональные данные хранятся в течение срока, необходимого для достижения целей обработки, или в течение срока, установленного законодательством.</p>

          <h2>6. Передача данных третьим лицам</h2>
          <p>Мы не передаем персональные данные третьим лицам, за исключением случаев:</p>
          <ul>
            <li>Когда это необходимо для предоставления услуг Системы</li>
            <li>По требованию законодательства или уполномоченных органов</li>
            <li>С явного согласия пользователя</li>
          </ul>

          <h2>7. Права пользователей</h2>
          <p>Вы имеете право:</p>
          <ul>
            <li>Получать информацию о ваших персональных данных</li>
            <li>Требовать исправления неточных данных</li>
            <li>Требовать удаления ваших персональных данных</li>
            <li>Отозвать согласие на обработку персональных данных</li>
            <li>Обжаловать действия по обработке персональных данных</li>
          </ul>

          <h2>8. Использование cookies</h2>
          <p>Система использует cookies для обеспечения функциональности и улучшения пользовательского опыта. Вы можете настроить браузер для отказа от cookies, однако это может ограничить функциональность Системы.</p>

          <h2>9. Изменения в Политике конфиденциальности</h2>
          <p>Мы оставляем за собой право вносить изменения в настоящую Политику конфиденциальности. Все изменения вступают в силу с момента их публикации в Системе.</p>

          <h2>10. Контактная информация</h2>
          <p>По всем вопросам, связанным с обработкой персональных данных, вы можете обратиться к администратору Системы.</p>

          <p><strong>Дата последнего обновления:</strong> 19 ноября 2025 года</p>
        `,
      },
    ],
    [
      AgreementType.TERMS_OF_SERVICE,
      {
        type: AgreementType.TERMS_OF_SERVICE,
        title: 'Пользовательское соглашение',
        version: '1.0',
        updatedAt: new Date('2025-11-19'),
        content: `
          <h2>1. Общие положения</h2>
          <p>Настоящее Пользовательское соглашение (далее — «Соглашение») определяет условия использования системы управления заявками Coffee (далее — «Система»).</p>
          <p>Используя Систему, вы подтверждаете, что ознакомились с условиями настоящего Соглашения и принимаете их без оговорок и ограничений.</p>

          <h2>2. Определения</h2>
          <ul>
            <li><strong>Система</strong> — веб-приложение для управления заявками, учет рабочего времени и расчет заработной платы</li>
            <li><strong>Пользователь</strong> — физическое лицо, получившее доступ к Системе</li>
            <li><strong>Учетная запись</strong> — индивидуальная учетная запись пользователя в Системе</li>
            <li><strong>Контент</strong> — любая информация, размещаемая в Системе</li>
          </ul>

          <h2>3. Регистрация и учетная запись</h2>
          <p>3.1. Для использования Системы необходимо пройти процедуру регистрации и создать учетную запись.</p>
          <p>3.2. Вы обязуетесь предоставлять достоверную и актуальную информацию при регистрации.</p>
          <p>3.3. Вы несете ответственность за сохранность учетных данных (логин и пароль).</p>
          <p>3.4. Запрещается передавать учетные данные третьим лицам.</p>
          <p>3.5. В случае несанкционированного доступа к вашей учетной записи вы обязаны немедленно уведомить администратора.</p>

          <h2>4. Права и обязанности пользователя</h2>
          <p>4.1. Пользователь имеет право:</p>
          <ul>
            <li>Использовать Систему в соответствии с ее функциональным назначением</li>
            <li>Получать информацию о своих данных и статистике</li>
            <li>Обращаться в техническую поддержку</li>
          </ul>
          <p>4.2. Пользователь обязуется:</p>
          <ul>
            <li>Использовать Систему только в законных целях</li>
            <li>Не нарушать права других пользователей</li>
            <li>Вводить достоверную информацию о выполненных работах</li>
            <li>Соблюдать конфиденциальность данных других пользователей</li>
            <li>Не предпринимать попытки взлома или несанкционированного доступа к Системе</li>
            <li>Не распространять вредоносное программное обеспечение</li>
          </ul>

          <h2>5. Функциональность Системы</h2>
          <p>5.1. Система предоставляет следующие функции:</p>
          <ul>
            <li>Создание и управление заявками</li>
            <li>Учет рабочего времени</li>
            <li>Расчет заработной платы</li>
            <li>Статистика и отчетность</li>
            <li>Управление пользователями и организациями</li>
          </ul>
          <p>5.2. Администратор оставляет за собой право изменять функциональность Системы в любое время.</p>

          <h2>6. Интеллектуальная собственность</h2>
          <p>6.1. Все права на Систему, включая программный код, дизайн, тексты и графические материалы, принадлежат правообладателю.</p>
          <p>6.2. Запрещается копирование, модификация, распространение или коммерческое использование Системы без письменного разрешения правообладателя.</p>

          <h2>7. Ответственность</h2>
          <p>7.1. Пользователь несет полную ответственность за данные, размещаемые им в Системе.</p>
          <p>7.2. Администратор не несет ответственности за:</p>
          <ul>
            <li>Неточности в данных, введенных пользователем</li>
            <li>Потери данных, вызванные действиями пользователя</li>
            <li>Временные сбои в работе Системы</li>
            <li>Последствия использования информации, полученной из Системы</li>
          </ul>
          <p>7.3. Система предоставляется «как есть», без каких-либо гарантий.</p>

          <h2>8. Ограничение использования</h2>
          <p>Запрещается:</p>
          <ul>
            <li>Использовать Систему для незаконной деятельности</li>
            <li>Попытки взлома или несанкционированного доступа</li>
            <li>Распространение спама или вредоносного контента</li>
            <li>Нарушение работы Системы или серверов</li>
            <li>Использование автоматизированных систем (ботов) без разрешения</li>
          </ul>

          <h2>9. Блокировка и удаление учетной записи</h2>
          <p>9.1. Администратор имеет право заблокировать или удалить учетную запись пользователя в случае нарушения условий настоящего Соглашения.</p>
          <p>9.2. Решение о блокировке принимается администратором по его усмотрению.</p>
          <p>9.3. Пользователь не имеет права требовать восстановления удаленной учетной записи.</p>

          <h2>10. Изменение условий Соглашения</h2>
          <p>10.1. Администратор оставляет за собой право вносить изменения в настоящее Соглашение в любое время.</p>
          <p>10.2. Изменения вступают в силу с момента их публикации в Системе.</p>
          <p>10.3. Продолжение использования Системы после внесения изменений означает согласие с новыми условиями.</p>

          <h2>11. Разрешение споров</h2>
          <p>11.1. Все споры, возникающие в связи с использованием Системы, решаются путем переговоров.</p>
          <p>11.2. В случае невозможности разрешения спора путем переговоров, споры подлежат рассмотрению в соответствии с законодательством Российской Федерации.</p>

          <h2>12. Заключительные положения</h2>
          <p>12.1. Настоящее Соглашение вступает в силу с момента принятия пользователем.</p>
          <p>12.2. Если какое-либо положение настоящего Соглашения будет признано недействительным, остальные положения остаются в силе.</p>
          <p>12.3. По всем вопросам, связанным с использованием Системы, вы можете обратиться к администратору.</p>

          <p><strong>Дата последнего обновления:</strong> 19 ноября 2025 года</p>
        `,
      },
    ],
    [
      AgreementType.DATA_PROCESSING,
      {
        type: AgreementType.DATA_PROCESSING,
        title: 'Согласие на обработку персональных данных',
        version: '1.0',
        updatedAt: new Date('2025-11-19'),
        content: `
          <h2>Согласие на обработку персональных данных</h2>
          <p>Я, принимая настоящее согласие, подтверждаю, что предоставляю свое согласие на обработку моих персональных данных в системе управления заявками Coffee (далее — «Оператор»).</p>

          <h2>1. Категории персональных данных</h2>
          <p>Я даю согласие на обработку следующих категорий персональных данных:</p>
          <ul>
            <li>Фамилия, имя, отчество</li>
            <li>Электронная почта</li>
            <li>Номер телефона</li>
            <li>Данные о должности и роли в системе</li>
            <li>Данные о рабочем времени и выполненных работах</li>
            <li>Данные о заработной плате</li>
            <li>Технические данные (IP-адрес, тип браузера, устройство)</li>
          </ul>

          <h2>2. Цели обработки</h2>
          <p>Персональные данные обрабатываются в следующих целях:</p>
          <ul>
            <li>Предоставление доступа к функционалу системы</li>
            <li>Управление заявками и учет рабочего времени</li>
            <li>Расчет заработной платы</li>
            <li>Формирование статистики и отчетов</li>
            <li>Коммуникация с пользователем</li>
            <li>Обеспечение безопасности системы</li>
          </ul>

          <h2>3. Способы обработки</h2>
          <p>Обработка персональных данных осуществляется следующими способами:</p>
          <ul>
            <li>Сбор и запись</li>
            <li>Систематизация и хранение</li>
            <li>Уточнение (обновление, изменение)</li>
            <li>Использование</li>
            <li>Передача (только в пределах организации)</li>
            <li>Блокирование</li>
            <li>Удаление</li>
          </ul>

          <h2>4. Срок действия согласия</h2>
          <p>Настоящее согласие действует с момента его предоставления и до момента отзыва согласия на обработку персональных данных.</p>

          <h2>5. Права субъекта персональных данных</h2>
          <p>Я осведомлен(а), что имею право:</p>
          <ul>
            <li>Требовать от Оператора уточнения моих персональных данных, их блокирования или уничтожения</li>
            <li>Требовать от Оператора извещения всех лиц, которым ранее были сообщены неточные или неполные мои персональные данные, обо всех произведенных в них изменениях</li>
            <li>Отозвать настоящее согласие в любое время путем направления письменного уведомления Оператору</li>
            <li>Обжаловать действия или бездействие Оператора в уполномоченный орган по защите прав субъектов персональных данных или в судебном порядке</li>
          </ul>

          <h2>6. Последствия отказа от предоставления согласия</h2>
          <p>Отказ от предоставления согласия на обработку персональных данных влечет невозможность использования функционала системы.</p>

          <p><strong>Дата предоставления согласия:</strong> 19 ноября 2025 года</p>
        `,
      },
    ],
  ]);

  ngOnInit(): void {
    // Получаем тип соглашения из URL
    const url = window.location.pathname;
    let agreementType: AgreementType | null = null;

    // Проверяем URL для определения типа
    if (url.includes('/privacy-policy')) {
      agreementType = AgreementType.PRIVACY_POLICY;
    } else if (url.includes('/terms-of-service')) {
      agreementType = AgreementType.TERMS_OF_SERVICE;
    } else if (url.includes('/data-processing')) {
      agreementType = AgreementType.DATA_PROCESSING;
    } else {
      // Пробуем получить из параметров роута
      const params = this.route.snapshot.paramMap;
      const typeParam = params.get('type');
      if (typeParam) {
        agreementType = typeParam as AgreementType;
      }
    }

    if (agreementType) {
      const agreement = this.staticAgreements.get(agreementType);
      if (agreement) {
        this.agreement.set(agreement);
        this.isLoading.set(false);
      } else {
        this.error.set('Соглашение указанного типа не найдено');
        this.isLoading.set(false);
      }
    } else {
      this.error.set('Тип соглашения не указан');
      this.isLoading.set(false);
    }
  }

  getTypeIcon(type?: AgreementType): string {
    switch (type) {
      case AgreementType.PRIVACY_POLICY:
        return 'privacy_tip';
      case AgreementType.TERMS_OF_SERVICE:
        return 'description';
      case AgreementType.DATA_PROCESSING:
        return 'security';
      default:
        return 'article';
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }
}

