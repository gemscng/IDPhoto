# IDPhoto

AI-powered children interview photo generator for Hong Kong parents. Upload a casual photo, get a studio-quality interview photo in seconds.

## Setup

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Package Manager:** pnpm

## Project Structure

```
src/
  app/
    page.tsx          # Landing page
    upload/page.tsx   # Upload & preview page
  components/
    photo-upload.tsx  # Drag-and-drop upload + camera capture
    image-preview.tsx # Before/after image preview
    ui/               # shadcn/ui components
```
