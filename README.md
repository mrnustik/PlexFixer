# PlexFixer

A Next.js app that scans and validates your Plex media library naming conventions.

## Running with Docker (recommended)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

### Quick start

1. Create a `docker-compose.yml` with the pre-built image from GitHub Container Registry:

```yaml
services:
  plexfixer:
    image: ghcr.io/mrnustik/plexfixer:latest
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - PLEX_TV_LIBRARY_PATHS=${PLEX_TV_LIBRARY_PATHS:-/media/tv}
      - PLEX_MOVIES_LIBRARY_PATHS=${PLEX_MOVIES_LIBRARY_PATHS:-/media/movies}
    volumes:
      - ${PLEX_TV_LIBRARY_PATHS:-/media/tv}:${PLEX_TV_LIBRARY_PATHS:-/media/tv}
      - ${PLEX_MOVIES_LIBRARY_PATHS:-/media/movies}:${PLEX_MOVIES_LIBRARY_PATHS:-/media/movies}
      - plexfixer_config:/app/config
    restart: unless-stopped

volumes:
  plexfixer_config:
```

2. Set your media library paths and start the container:

```bash
PLEX_TV_LIBRARY_PATHS=/path/to/your/tv \
PLEX_MOVIES_LIBRARY_PATHS=/path/to/your/movies \
docker compose up -d
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

The following environment variables can be set:

| Variable                    | Default         | Description                    |
| --------------------------- | --------------- | ------------------------------ |
| `PLEX_TV_LIBRARY_PATHS`     | `/media/tv`     | Path to your TV library        |
| `PLEX_MOVIES_LIBRARY_PATHS` | `/media/movies` | Path to your movies library    |
| `PORT`                      | `3000`          | Host port to expose the app on |

You can also create a `.env` file in the project root:

```env
PLEX_TV_LIBRARY_PATHS=/mnt/media/tv
PLEX_MOVIES_LIBRARY_PATHS=/mnt/media/movies
PORT=3000
```

Then run:

```bash
docker compose up -d
```

### Building manually

```bash
docker build -t plexfixer .
docker run -p 3000:3000 \
  -v /path/to/tv:/path/to/tv \
  -v /path/to/movies:/path/to/movies \
  -e PLEX_TV_LIBRARY_PATHS=/path/to/tv \
  -e PLEX_MOVIES_LIBRARY_PATHS=/path/to/movies \
  plexfixer
```

## Local Development

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
