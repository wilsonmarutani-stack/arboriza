# Sistema de Arborização Urbana

## Overview

This is a comprehensive urban tree inspection management system designed for electric utility companies in Brazil. The application combines AI-powered species identification, interactive mapping, and detailed reporting to streamline tree inspection workflows. The system supports field data collection with GPS coordinates, photo uploads, AI species identification using OpenAI Vision, and generates various export formats including CSV, PDF, and KML for integration with other tools.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for type safety and modern development
- **Vite** as the build tool for fast development and optimized production builds
- **TailwindCSS** for responsive styling with custom design system
- **Shadcn/ui** component library for accessible, consistent UI components
- **Leaflet + OpenStreetMap** for interactive mapping with MarkerCluster for performance
- **React Hook Form** with Zod validation for robust form handling
- **TanStack Query** for efficient server state management and caching

### Backend Architecture
- **Node.js + Express** with TypeScript for the REST API server
- **Drizzle ORM** with PostgreSQL for type-safe database operations
- **Multer** for file upload handling with local storage (prepared for S3 migration)
- **Express sessions** for basic authentication state management
- **Modular service architecture** with separate services for exports, AI identification, and object storage

### Database Design
- **Hierarchical structure**: EA (Advanced Stations) → Municipalities → Feeders → Substations
- **Core inspection entity** with comprehensive metadata including GPS coordinates, priority levels, and species identification results
- **Normalized reference tables** for organizational data (EAs, municipalities, feeders, substations)
- **Species candidate tracking** for AI identification confidence scoring
- **PostgreSQL** with UUID primary keys and proper foreign key relationships

### AI Integration
- **OpenAI Vision API (GPT-5)** for tree species identification from uploaded photos
- **Structured response format** returning multiple species candidates with confidence levels
- **Base64 image encoding** for API transmission
- **Fallback handling** for API failures and offline scenarios

### File Management
- **Local file storage** in `/uploads` directory for development
- **Google Cloud Storage integration** prepared for production deployments
- **Object ACL system** for fine-grained access control
- **Image optimization** and validation for uploaded tree photos

### Mapping System
- **Leaflet integration** with custom tree icons differentiated by priority levels
- **Marker clustering** for performance with large datasets
- **Draggable markers** for manual coordinate adjustment
- **Reverse geocoding** using Nominatim for automatic address population
- **Real-time filtering** by various inspection criteria

### Export Capabilities
- **CSV export** with all inspection data fields
- **PDF generation** with professional formatting and company branding
- **KML export** for Google Earth integration with custom tree icons
- **Filtering options** for customized reports by date range, location, and priority

## External Dependencies

### Core Services
- **OpenAI API** - GPT-5 Vision model for tree species identification
- **OpenStreetMap/Nominatim** - Map tiles and reverse geocoding services
- **Google Cloud Storage** - Object storage for production file uploads (via Replit sidecar)

### Development Tools
- **Replit Environment** - Cloud-based development platform
- **Vite Dev Server** - Hot module replacement and development tooling
- **TypeScript Compiler** - Type checking and compilation

### UI Libraries
- **Radix UI Primitives** - Accessible component foundations
- **Leaflet** - Interactive mapping library
- **React Hook Form** - Form state management
- **Zod** - Runtime type validation

### Database & ORM
- **PostgreSQL** - Primary database (Neon serverless in production)
- **Drizzle Kit** - Database migrations and schema management
- **Connect PG Simple** - PostgreSQL session store

### File Processing
- **Multer** - Multipart form data handling for file uploads
- **Sharp** (prepared) - Image processing and optimization
- **PDF generation libraries** - For report creation