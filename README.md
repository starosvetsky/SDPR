# SDPR: Full-stack шаблон приложения

Готовый каркас: публичная страница, API, БД, админ-панель и инструкции для развёртывания на физическом сервере с доменом.

## 1) Что уже реализовано

- **Backend (Node.js + Express)**:
  - API здоровья: `GET /api/health`
  - Публичные страницы: `GET /api/public/pages`
  - Приём заявок с сайта: `POST /api/leads`
  - Авторизация администратора: `POST /api/admin/login`
  - Админ API для статистики, страниц и заявок
- **База данных (SQLite)**:
  - Таблицы: `admins`, `pages`, `leads`
  - Автосоздание таблиц при запуске
  - Автосоздание дефолтного администратора
- **Frontend**:
  - Адаптивная публичная страница (`/`)
  - Адаптивная админ-панель (`/admin`)
  - CRUD для страниц и управление статусами заявок

## 2) Структура проекта

```text
.
├── package.json
├── .env.example
├── src/
│   ├── index.js
│   ├── db.js
│   └── auth.js
└── public/
    ├── index.html
    ├── admin.html
    ├── styles.css
    ├── app.js
    └── admin.js
```

## 3) Локальный запуск

```bash
cp .env.example .env
npm install
npm run dev
```

Откройте:
- `http://localhost:3000/` — сайт
- `http://localhost:3000/admin` — админ-панель

Стандартный вход (из `.env`):
- Логин: `admin`
- Пароль: `admin123`

## 4) Логика серверной работы (физический сервер + домен)

Ниже production-схема для размещения на своём сервере:

1. **OS + runtime**
   - Ubuntu 22.04+
   - Node.js 20+
   - Nginx

2. **Деплой кода**
   - Клонируете проект в `/var/www/sdpr`
   - Создаёте `.env` с безопасными значениями
   - Устанавливаете зависимости: `npm ci --omit=dev`

3. **Systemd сервис** (`/etc/systemd/system/sdpr.service`):

```ini
[Unit]
Description=SDPR App
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/sdpr
ExecStart=/usr/bin/node /var/www/sdpr/src/index.js
EnvironmentFile=/var/www/sdpr/.env
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Команды:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sdpr
sudo systemctl start sdpr
sudo systemctl status sdpr
```

4. **Nginx reverse proxy** (`/etc/nginx/sites-available/sdpr.conf`):

```nginx
server {
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Команды:

```bash
sudo ln -s /etc/nginx/sites-available/sdpr.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

5. **SSL (Let’s Encrypt)**

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

6. **Безопасность**
   - Обязательно поменяйте `JWT_SECRET` и пароль администратора
   - Ограничьте доступ к `/admin` (по IP/Basic Auth на Nginx при необходимости)
   - Настройте бэкап `data.sqlite`

## 5) Что делать дальше (этапы развития)

- Добавить роли пользователей (owner/editor/manager)
- Перейти на PostgreSQL
- Добавить файл-менеджер и загрузку изображений
- Сделать аудит действий администратора
- Вынести frontend в React/Vue и подключить CI/CD

