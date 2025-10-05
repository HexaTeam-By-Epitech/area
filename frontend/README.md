# AREA Frontend

Vue 3 + Vite web application for the AREA project.

## Technologies

- **Vue 3** - Progressive JavaScript framework with Composition API
- **Vite** - Fast build tool and dev server
- **Vue Router** - Official routing library
- **Pinia** - State management
- **Axios** - HTTP client for API calls
- **TypeScript** - Type-safe development
- **InteractJS** - Drag and drop interactions

## Prerequisites

- Node.js 20+
- npm 10+
- Backend API running (see `backend/README.md`)

## Environment Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` if needed:

- `VITE_API_URL` - Backend API URL (default: `http://localhost:3000`)

**Note:** The Vite dev server uses a proxy configuration (see `vite.config.js`) to forward `/auth` requests to the backend API, avoiding CORS issues during development.

## Installation

Install dependencies:

```bash
npm ci
```

## Running the Application

### Development mode

Start the Vite dev server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (default Vite port).

### Production build

1. Build the application:

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

2. Preview the production build locally:

```bash
npm run preview
```

## Docker

Build and run the frontend as a Docker container:

```bash
# Build image
docker build -t area-web:local .

# Run container
docker run --rm \
  --name area-web \
  -p 8080:80 \
  area-web:local
```

The application will be served by NGINX on port 80 (mapped to 8080 on the host).

**Note:** The Docker image serves static files. Make sure to configure the backend API URL correctly for production.

## Project Structure

```
frontend/
├── src/
│   ├── main.js              # Application entry point
│   ├── App.vue              # Root component
│   ├── router/              # Vue Router configuration
│   ├── stores/              # Pinia stores (state management)
│   ├── views/               # Page components
│   │   ├── auth/            # Authentication pages (Login, Register)
│   │   └── ...              # Other views
│   ├── components/          # Reusable components
│   ├── utils/               # Utility functions
│   └── assets/              # Static assets (images, styles)
├── public/                  # Public static files
├── .env.example             # Environment variables template
├── vite.config.js           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Development Tips

### Proxy Configuration

The `vite.config.js` includes a proxy for `/auth` routes:

```js
server: {
  proxy: {
    '/auth': 'http://localhost:3000',
  }
}
```

This means when you make a request to `/auth/login` in your Vue app, it will be proxied to `http://localhost:3000/auth/login`.

### Hot Module Replacement (HMR)

Vite provides instant HMR. When you save a file, changes are reflected in the browser immediately without a full page reload.

### Vue DevTools

Install the [Vue DevTools browser extension](https://devtools.vuejs.org/) for debugging:
- Inspect component hierarchy
- View and edit component state
- Monitor events and performance

## Linting & Formatting

If you have ESLint/Prettier configured, you can run:

```bash
npm run lint       # Lint code
npm run format     # Format code
```

(These scripts need to be added to `package.json` if not already present.)

## Troubleshooting

### Backend connection issues

- Verify the backend is running on `http://localhost:3000`
- Check the proxy configuration in `vite.config.js`
- Check browser console for CORS or network errors

### Port conflicts

If port 5173 is in use, Vite will automatically try the next available port. You can also specify a custom port in `vite.config.js`:

```js
server: {
  port: 3001,
  proxy: {
    '/auth': 'http://localhost:3000',
  }
}
```

### Build errors

- Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Clear Vite cache: `rm -rf .vite`

## License

This project is for educational purposes.
