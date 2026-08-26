# Remix of Remix of Remix of Career Compass AI

🚨 MASTER RULE

This project is NOT a demo.

This project is NOT a portfolio template.

This project is NOT a CRUD application.

This project is NOT a dashboard template.

This project is NOT a clone of another website.

This project must feel like a premium AI Operating System that people would happily pay for.

Everything must look production-ready.

Everything must use real architecture.

Everything must be scalable.

Everything must follow software engineering best practices.

Never sacrifice quality for speed.

Never generate placeholder pages.

Never hardcode data.

Never fake statistics.

Never use lorem ipsum.

Never use dummy users.

Never generate mock jobs.

Never use fake analytics.

Everything must come from the database or real APIs.

🚀 PHASE 1 — PART 1

CareerOS Master Blueprint

Foundation + Architecture + Design Bible + Engineering Standards

PROJECT NAME

CareerOS

PROJECT TAGLINE

Your AI Career Operating System.

Not another job portal.

Not another resume builder.

Not another dashboard.

CareerOS becomes an intelligent operating system that understands users, continuously improves their career profile, discovers opportunities, prepares applications, automates repetitive work, and helps them grow professionally through specialized AI agents.

PROJECT VISION

CareerOS should feel like combining

 Cursor

 Linear

 Vercel

 Raycast

 OpenAI

 Perplexity

 Arc Browser

 Notion

into one seamless AI-powered career platform.

The experience should be so polished that a recruiter, engineer, or investor believes it is a funded startup.

CORE PRODUCT PRINCIPLES

CareerOS must always follow these principles:

 Real Data First

 No fake content.

 No placeholder dashboards.

 Every screen reflects actual user information or clearly communicates an empty state.

 AI as a Native Experience

 AI is integrated into every workflow.

 AI is never presented as an isolated chatbot.

 One Source of Truth

 The user's authenticated profile and structured resume data power every feature.

 Premium Design

 Minimal.

 Elegant.

 Intentional.

 Spacious.

 Consistent.

 Engineering Quality

 Modular architecture.

 Scalable codebase.

 Reusable components.

 Clear separation of concerns.

PRIMARY TECH STACK

Frontend

 Next.js (App Router)

 React

 TypeScript

 Tailwind CSS

 Framer Motion

 Lucide Icons

 shadcn/ui (only as a base—customized to match the CareerOS design system, never default styles)

Backend

 Next.js Server Actions

 Route Handlers

 TypeScript

Authentication

 Supabase Auth

 Google OAuth

 GitHub OAuth

 Email & Password

 Email Verification

 Password Reset

 JWT Session Management

Database

 Supabase PostgreSQL

Storage

 Supabase Storage

AI

 Gemini API

Future architecture should allow adding additional providers later without major refactoring.

Background Jobs

 Redis

 BullMQ

Deployment

 Docker

 GitHub Actions

 AWS

APPLICATION ARCHITECTURE

CareerOS must follow a modular architecture.

Presentation Layer

↓

Application Layer

↓

Business Logic Layer

↓

AI Layer

↓

Data Layer

↓

Infrastructure Layer

Each layer must have a single responsibility.

No business logic inside UI components.

No database calls inside presentational components.

No AI prompts embedded inside page files.

PROJECT STRUCTURE

app/

components/

features/

hooks/

lib/

actions/

services/

ai/

database/

types/

constants/

utils/

styles/

providers/

middleware/

public/


Every feature must remain isolated and modular.

FEATURE MODULES

Each major feature has its own module.

Example:

Authentication

Resume Intelligence

Career Brain

Dashboard

Jobs

Applications

Interview

Learning

Recruiter CRM

Career Coach

Analytics

Billing

Admin

Notifications

Each module owns:

 components

 hooks

 services

 types

 validation

 API helpers

 AI logic (if applicable)

DESIGN BIBLE (LOCKED)

The following design language is mandatory.

Never replace it.

Never simplify it.

Never substitute with template styles.

Visual Identity

The interface must communicate:

Precision.

Confidence.

Intelligence.

Trust.

Premium quality.

Minimalism.

Engineering excellence.

DESIGN REFERENCES

Primary inspiration:

 Cursor

 Linear

 Vercel

 Raycast

 OpenAI

 Arc Browser

 Perplexity

 Apple Human Interface Guidelines

Never imitate directly.

Use these only as references for quality, spacing, and interaction design.

COLOR SYSTEM

Must use the exact palette provided by the product specification:

 Primary Background — #1E1E1E

 Secondary Background — #252526

 Card Background — #2A2A2A

 Elevated Surface — #313131

 Border — #3A3A3A

 Primary Accent — #4F8CFF

 Primary Accent Hover — #6AA2FF

 Secondary Accent — #22D3EE

 Success — #22C55E

 Warning — #FACC15

 Danger — #EF4444

 Text Primary — #FFFFFF

 Text Secondary — #D4D4D4

 Muted Text — #9E9E9E

Do not introduce arbitrary colors.

TYPOGRAPHY

Google Sans Display

Only for:

 Hero headings

 Dashboard titles

 Large page titles

Inter

Only for:

 Body text

 Buttons

 Forms

 Tables

 Sidebar

JetBrains Mono

Only for:

 Terminal

 AI reasoning

 Logs

 Console

 Debug information

Never use monospace for the general UI.

SPACING SYSTEM

Strict 8-point grid.

Generous whitespace.

Maximum content width:

1440px

COMPONENT PHILOSOPHY

Every component should feel handcrafted.

Buttons:

 Large

 Rounded

 Smooth hover

 Premium transitions

Inputs:

 Accessible

 Spacious

 Clean

Cards:

 Elevated

 Minimal border

 Large padding

 Subtle depth

ANIMATION PHILOSOPHY

Every interaction should feel intentional.

Use Framer Motion.

Allowed animations:

 Fade

 Scale

 Opacity

 Slide

 Layout transitions

 Shared element transitions

No flashy animations.

No exaggerated effects.

No bouncing everywhere.

Motion should communicate state, not decoration.

AI EXPERIENCE

Never display:

Loading...

Instead use contextual progress messages such as:

 Reading your resume…

 Understanding your experience…

 Matching skills with current opportunities…

 Building your Career Brain…

 Preparing your dashboard…

 Researching company requirements…

Every AI action should communicate what it is doing.

COMMAND PALETTE

Global shortcut:

⌘ / Ctrl + K

Capabilities:

 Navigate

 Search

 Open pages

 Execute future AI actions

 Quickly access user workflows

It must feel similar to modern developer tools while remaining unique to CareerOS.

SIDEBAR

Features:

 Collapsible

 Smooth animation

 Active indicator

 User profile

 Current plan

 Notification badge

 Career Health mini widget

DASHBOARD PHILOSOPHY

Never design a statistics dashboard.

CareerOS is an AI Command Center.

Priority:

Welcome

↓

Career Health

↓

Today's Focus

↓

AI Recommendation

↓

Career DNA

↓

Resume Status

↓

Recent Activity

↓

Quick Actions

↓

Career Timeline

Every card should provide meaningful guidance rather than vanity metrics.

AI AGENT ARCHITECTURE

CareerOS should use specialized AI agents rather than one generic assistant.

Initial agents:

 Resume Intelligence Agent

 Career Intelligence Agent

 Job Discovery Agent

 Job Matching Agent

 Resume Optimization Agent

 Cover Letter Agent

 Interview Agent

 Learning Agent

 Career Coach Agent

 Recruiter Agent

 Application Agent

Each agent has a clearly defined responsibility.

All agents share the same structured user profile and database.

MASTER ENGINEERING RULES

Never hardcode user data.

Never hardcode dashboard numbers.

Never create fake analytics.

Never generate placeholder jobs.

Never fake notifications.

Never use static JSON pretending to be live data.

Always build reusable components.

Always use TypeScript.

Always validate user input.

Always handle empty states.

Always design mobile responsiveness from the beginning.

Always think like a production engineer, not like someone building a classroom assignment.

QUALITY TARGET

Every screen should satisfy this question:

"Would this screen look natural in a product from OpenAI, Linear, Cursor, or Vercel?"

If the answer is no, redesign it before implementation.System Architecture + Authentication + Database + Backend Foundation

Prompt for AI Coding Assistant

You are continuing the CareerOS project from Phase 1 Part 1. Do NOT recreate or modify anything already completed. Build only the systems described below while following the locked Design Bible, Architecture Rules, and Engineering Standards established in Part 1.

This is a production-grade application, not a demo. Never use fake data, placeholder statistics, or mock implementations unless explicitly required for local development.

🎯 Objective

Build the complete backend foundation, authentication system, project architecture, database, storage, security, API standards, and application infrastructure required for every future module.

Everything must be modular, scalable, reusable, and production-ready.

📂 Folder Architecture

Create a scalable feature-first architecture.

app/
(auth)
(dashboard)
(onboarding)
api/

components/
ui/
layout/
shared/
animations/

features/
auth/
dashboard/
resume/
profile/
jobs/
applications/
career-brain/
analytics/
notifications/
billing/
admin/
career-coach/
interview/
learning/

actions/
server/

services/
supabase/
ai/
jobs/
storage/
auth/

lib/
config/
helpers/
validators/
constants/

database/
migrations/
queries/

hooks/

providers/

types/

middleware/

styles/

public/
fonts/
images/
icons/

Every feature owns its:

 components

 hooks

 types

 services

 validation

 server actions

 utilities

Never create one huge shared folder.

⚙️ Environment Variables

Use .env.local

Support

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

GOOGLE_CLIENT_ID

GOOGLE_CLIENT_SECRET

GITHUB_CLIENT_ID

GITHUB_CLIENT_SECRET

GEMINI_API_KEY

REDIS_URL

BULLMQ_PREFIX

NEXTAUTH_SECRET

NEXT_PUBLIC_APP_URL

BROWSERBASE_API_KEY

PLAYWRIGHT_API_KEY



Never expose secrets to client components.

🔐 Authentication

Implement production authentication.

Support

✅ Google OAuth

✅ GitHub OAuth

✅ Email

✅ Password

✅ Forgot Password

✅ Email Verification

✅ Password Reset

✅ Remember Me

✅ Session Refresh

✅ Secure Logout

Login Flow

Visitor

↓

Login

↓

OAuth / Email

↓

Supabase Auth

↓

JWT

↓

Profile Check

↓

Onboarding Check

↓

Dashboard

Signup Flow

Signup

↓

Email Verification

↓

Create User

↓

Create Profile

↓

Create Settings

↓

Start Onboarding

OAuth

Google

Collect

 name

 email

 avatar

 verified email

GitHub

Collect

 username

 avatar

 public profile URL

 bio (if available)

 website (if available)

Do NOT invent additional information.

Session Rules

Persistent login

Secure cookies

Auto refresh

Protected routes

Expired session redirect

Roles (RBAC)

User

Admin

Super Admin

Future-proof for enterprise roles.

Database

Use Supabase PostgreSQL.

Normalize the schema.

Avoid duplicated data.

Core Tables

users

profiles

user_settings

resume_files

resume_versions

skills

projects

education

experience

certifications

languages

social_links

career_preferences

career_health

career_dna

jobs

job_matches

saved_jobs

applications

application_logs

notifications

interview_sessions

learning_paths

career_coach_chats

recruiters

meetings

followups

billing

subscriptions

credits

feature_usage

system_logs

audit_logs

Every table should include

id

created_at

updated_at

Use UUID primary keys.

Relationships

User

↓

Profile

↓

Resume

↓

Career Brain

↓

Jobs

↓

Applications

↓

Analytics

One user owns

 multiple resumes

 multiple applications

 multiple recruiters

 multiple interviews

 multiple notifications

Resume Storage

Use Supabase Storage.

Buckets

resumes

avatars

generated-resumes

generated-coverletters

Private buckets.

Signed URLs only.

API Standards

Never place business logic inside components.

Flow

UI

↓

Server Action

↓

Service

↓

Database

↓

Return DTO

Components never query database directly.

Validation

Use

Zod

Validate

 forms

 uploads

 API requests

 AI outputs

Reject invalid data.

Error Handling

Global error boundary.

Typed errors.

User-friendly messages.

Retry support.

No raw database errors.

Logging

Log

Authentication

Uploads

Resume Parsing

AI Requests

Applications

Errors

Admin Actions

Billing

Audit Events

Use structured logs.

Security

Enable

JWT

RLS

Rate Limiting

CSRF Protection

XSS Protection

Input Sanitization

SQL Injection Protection

Secure Headers

Protected Server Actions

Private Storage

Never trust client input.

Middleware

Protect

Dashboard

Profile

Resume

Jobs

Applications

Admin

Billing

Redirect unauthenticated users.

State Management

Use

React Query

Zustand

React Query

Server Data

Zustand

UI State

Do not store server data in Zustand.

AI Layer Architecture

Create modular AI services.

Resume AI

Career AI

Matching AI

Interview AI

Learning AI

Coach AI

Application AI

Every AI module has

Prompt

Validation

Parser

Response Model

Error Handling

Never call Gemini directly inside pages.

Backend Services

Create service layer.

AuthService

ProfileService

ResumeService

JobService

ApplicationService

NotificationService

CareerService

InterviewService

AnalyticsService

Each service owns all business logic.

Naming Standards

Components

PascalCase

Hooks

useSomething

Functions

camelCase

Constants

UPPER_CASE

Folders

kebab-case

Never mix conventions.

Performance Rules

Use

Lazy Loading

Dynamic Imports

Image Optimization

Code Splitting

Server Components

Streaming where appropriate.

Avoid unnecessary client components.

Empty States

Never show blank pages.

Examples

"No applications yet."

"Upload your resume to start."

"Connect GitHub to enrich your profile."

Always provide a next action.

Accessibility

Keyboard navigation

Focus indicators

ARIA labels

Screen reader support

High contrast

Reduced motion support

Developer Rules

Never duplicate logic.

Never hardcode IDs.

Never hardcode users.

Never hardcode jobs.

Never hardcode analytics.

Write reusable code.

Write scalable code.

Write production-ready code.

Think like a senior software engineer.🚀 CareerOS — Phase 1 | Part 3

Landing Experience + Design System Implementation + Navigation + Core UI Foundation

Prompt for AI Coding Assistant

Continue from Phase 1 Part 2. Do NOT recreate authentication, backend, database, folder structure, or security. Build only the UI foundation and public experience while following the locked Design Bible from Part 1.

This is not a landing page template. Build a premium AI startup experience that feels like Cursor, Linear, Vercel, Arc, OpenAI, Perplexity, Raycast, and Apple, while remaining unique to CareerOS.

🎯 Objective

Build the complete UI foundation, reusable design system, navigation, landing page, and application shell.

Everything must be production-ready, responsive, animated, reusable, and accessible.

🌍 Landing Page Sections

Create these sections in order:

Navigation

↓

Hero

↓

Trusted By / Social Proof

↓

CareerOS Demo Preview

↓

Core Features

↓

How CareerOS Works

↓

AI Agents

↓

Why CareerOS

↓

Pricing

↓

Testimonials

↓

FAQ

↓

Call To Action

↓

Footer

Every section must feel premium.

No template layouts.

🧭 Navigation

Sticky navigation.

Transparent initially.

Blur on scroll.

Contains:

 Logo

 Features

 Pricing

 FAQ

 Login

 Get Started

Desktop

↓

Horizontal Menu

Mobile

↓

Animated Drawer

Smooth transition.

🚀 Hero Section

Large premium hero.

Contains

 Headline

 Supporting text

 Primary CTA

 Secondary CTA

 Animated AI illustration

 Floating UI elements

Do NOT use stock illustrations.

Create a custom AI operating system visualization.

🎥 Product Preview

Instead of screenshots,

Create an animated interactive dashboard preview.

Show

 AI Dashboard

 Resume Analysis

 Job Matching

 Career Health

 AI Agents

The preview should feel alive.

⭐ Core Features

Large feature cards.

Each card

 Icon

 Title

 Description

 Subtle hover animation

No icon overload.

🤖 AI Agent Section

Introduce

 Resume Agent

 Career Agent

 Job Agent

 Interview Agent

 Learning Agent

 Application Agent

Each card shows

 Purpose

 Status

 Small animation

💡 How CareerOS Works

Timeline

Create Account

↓

Upload Resume

↓

Career Brain

↓

Find Jobs

↓

Optimize Resume

↓

Generate Cover Letter

↓

Apply

↓

Track Growth

Animated timeline.

💳 Pricing

Professional pricing layout.

Plans

 Free

 Pro

 Enterprise

Include

 Feature comparison

 Credit usage

 CTA

No payment implementation yet.

💬 Testimonials

Elegant cards.

Avatar

Name

Role

Company

Review

Auto-scroll animation.

❓ FAQ

Animated accordion.

Smooth expansion.

Accessible.

📞 CTA

Large premium banner.

Headline

Description

Primary Button

Secondary Button

Background animation.

🦶 Footer

Contains

 Logo

 Product

 Company

 Resources

 Legal

 Social

Minimal.

🎨 Reusable UI Components

Create reusable components for:

 Button

 Input

 Textarea

 Select

 Checkbox

 Radio

 Switch

 Card

 Modal

 Drawer

 Dialog

 Tooltip

 Badge

 Tabs

 Accordion

 Avatar

 Divider

 Spinner

 Empty State

 Search

 Breadcrumb

 Pagination

 Table

 Toast

 Dropdown

 Context Menu

 Skeleton Loader

No default styles.

Everything follows CareerOS design.

📱 Responsive Layout

Support

Desktop

Laptop

Tablet

Mobile

Ultra-wide

Never simply shrink components.

Adapt layouts intelligently.

✨ Motion System

Use Framer Motion.

Animate

 Page transitions

 Cards

 Buttons

 Hover

 Navigation

 Hero

 Sections

 Dialogs

 Drawers

 Accordion

 Pricing cards

 Feature cards

Motion should feel subtle and premium.

🎯 Micro Interactions

Buttons

↓

Hover lift

Cards

↓

Soft elevation

Inputs

↓

Animated focus

Links

↓

Underline animation

Icons

↓

Small motion

Navigation

↓

Smooth active indicator

🧠 AI Loading Experience

Replace generic loading.

Examples

 🧠 Preparing your workspace...

 🔍 Researching opportunities...

 📄 Reading your resume...

 💡 Generating insights...

 ⚡ Building dashboard...

Create reusable AI status component.

🎨 Icons

Use one icon family only.

Lucide Icons.

Consistent stroke width.

🔎 Global Command Palette

Shortcut

Ctrl + K

Functions

 Search

 Navigate

 Open Dashboard

 Resume

 Jobs

 Profile

 Future AI Commands

Premium overlay.

Keyboard-first.

🪟 Application Shell

Create reusable shell.

Includes

 Sidebar

 Header

 Content Area

 Notification Area

 Command Palette

 Theme Provider

Every authenticated page uses the same shell.

📌 Sidebar

Contains

 Dashboard

 Jobs

 Applications

 Resume

 Career Coach

 Learning

 Recruiters

 Analytics

 Billing

 Settings

Bottom

 User Profile

 Current Plan

 Career Health Mini Card

Collapsed & Expanded modes.

Animated.

🔔 Header

Contains

 Search

 Notifications

 Command Palette Button

 Profile Menu

Clean.

Minimal.

📄 Empty States

Create premium empty states.

Examples

No Resume

No Jobs

No Applications

No Notifications

No Saved Jobs

Every empty state includes

 Illustration

 Explanation

 CTA

🌙 Theme

Dark mode only for now.

No light mode implementation.

Follow locked color palette.

⚡ Performance

Use

 Server Components

 Dynamic Imports

 Lazy Loading

 Image Optimization

 Font Optimization

Avoid unnecessary client components.

♿ Accessibility

Keyboard navigation

Focus rings

ARIA labels

Reduced motion

Screen reader support

📋 Code Standards

 Reusable components only

 No duplicated layouts

 No inline styles

 No hardcoded spacing

 No magic numbers

 Strong TypeScript typing

 Clean folder organization

🚫 Do NOT Build Yet

Do NOT implement

 Resume Upload

 Resume Parsing

 Dashboard Widgets

 Career Brain

 Job Discovery

 Job Matching

 Auto Apply

 AI Chat

 Analytics

 Billing Logic

 Admin Panel

Only create the UI foundation and public experience.🚀 CareerOS — Phase 1 | Part 4

Production Readiness + Code Standards + Quality Assurance + Final Foundation

Prompt for AI Coding Assistant

Continue from Phase 1 Parts 1–3. Do NOT recreate any existing implementation. This part finalizes the CareerOS foundation and prepares the application for all future phases.

Everything must be production-ready, scalable, maintainable, secure, and follow enterprise software engineering standards.

🎯 Objective

Complete the project foundation by implementing production standards, global providers, monitoring, testing infrastructure, performance optimization, developer experience, and quality assurance.

This concludes Phase 1.

🌐 Global Providers

Create reusable global providers.

Include

 Authentication Provider

 Theme Provider

 Query Provider (TanStack Query)

 Toast Provider

 Modal Provider

 Command Palette Provider

 Animation Provider

 Error Boundary Provider

Wrap the application correctly.

Avoid unnecessary provider nesting.

⚙️ Global Configuration

Create centralized configuration.

Include

 App Metadata

 App Name

 Version

 API URLs

 Feature Flags

 Environment Validation

 Route Constants

 Navigation Constants

 Error Messages

 Success Messages

Never hardcode strings across the application.

🛣 Route Architecture

Organize routes clearly.

Public

 Landing

 Login

 Signup

 Forgot Password

 Verify Email

 Pricing

 Terms

 Privacy

Protected

 Dashboard

 Profile

 Resume

 Jobs

 Applications

 Career Coach

 Learning

 Recruiters

 Analytics

 Billing

 Settings

Admin

 Admin Dashboard

 Users

 Workers

 Logs

 AI Usage

 Revenue

 Feature Flags

Unauthorized users must never access protected routes.

🚨 Global Error System

Create centralized error handling.

Support

 API Errors

 Validation Errors

 Authentication Errors

 Network Errors

 AI Errors

 Storage Errors

 Unknown Errors

Display clean user-friendly messages.

Never expose stack traces.

📝 Logging Architecture

Create structured logging.

Log

 Authentication

 Resume Uploads

 AI Requests

 Job Search

 Applications

 Billing

 Admin Actions

 Errors

 Performance Events

Include

 Timestamp

 User ID (when authenticated)

 Event Type

 Severity

 Context

Prepare for future monitoring integration.

📊 Monitoring Preparation

Create monitoring interfaces.

Track

 API Response Time

 AI Response Time

 Page Load Time

 Route Errors

 Failed Requests

 Worker Status

 Storage Usage

No third-party monitoring integration yet.

Design the architecture for future addition.

🚀 Performance Standards

Optimize

 Fonts

 Images

 Icons

 Bundles

 Dynamic Imports

 Lazy Components

 Route Splitting

 Caching Strategy

Target

 Fast First Load

 Smooth Navigation

 Minimal Layout Shift

🛡 Security Standards

Implement

 CSP Headers

 Secure Cookies

 Input Sanitization

 File Validation

 Rate Limiting Hooks

 CSRF Protection

 XSS Protection

 Secure HTTP Headers

Never trust client input.

Prepare secure server-side validation.

📂 File Upload Foundation

Create reusable upload service.

Support

 PDF

 DOCX

 PNG

 JPG

Include

 Size Validation

 MIME Validation

 Duplicate Detection

 Upload Progress

 Cancel Upload

 Retry Upload

Do not implement resume parsing yet.

🔔 Notification Foundation

Create reusable notification system.

Support

 Success

 Warning

 Error

 Info

 AI Progress

Support

 Toast

 In-App Notifications

 Badge Counter

Backend integration comes later.

🔍 Search Foundation

Create reusable search components.

Support

 Global Search UI

 Debounced Search

 Keyboard Navigation

 Search Suggestions

 Empty Results

Backend integration later.

🧩 Reusable Layouts

Create layouts for

 Authentication

 Dashboard

 Admin

 Full Screen

 Settings

Avoid duplicate layout code.

📄 SEO Foundation

Implement

 Dynamic Metadata

 Open Graph

 Twitter Cards

 Favicon

 Robots

 Sitemap Preparation

 Canonical URLs

Public pages only.

📱 PWA Preparation

Prepare architecture for

 Manifest

 Offline Support

 Install Prompt

 Icons

Do not implement service workers yet.

🧪 Testing Foundation

Configure testing architecture.

Prepare

 Unit Testing

 Component Testing

 Integration Testing

 End-to-End Testing

Create test folder structure and standards.

Future phases will add actual tests.

📚 Documentation Standards

Create project documentation.

Include

 Installation Guide

 Environment Setup

 Folder Structure

 Coding Standards

 Naming Conventions

 Git Workflow

 Contribution Guide

Prepare for team collaboration.

🌿 Git Workflow

Define branch strategy.

Examples

 main

 develop

 feature/*

 fix/*

 hotfix/*

 release/*

Use meaningful commit messages.

📦 Dependency Rules

Only install packages that are actively used.

Avoid unnecessary dependencies.

Prefer lightweight solutions.

Document every major dependency.

🎨 Final UI Consistency Audit

Verify

 Colors

 Typography

 Icons

 Radius

 Spacing

 Shadows

 Animations

 Buttons

 Forms

 Cards

Every screen must match the locked Design Bible.

📈 Scalability Rules

Design the project to support future additions without major refactoring.

Future modules include

 Resume Intelligence

 Career Brain

 Job Discovery

 Job Matching

 AI Auto Apply

 Interview Preparation

 Learning

 Analytics

 Billing

 Admin

Current architecture must already support these modules.

🚫 Do NOT Build Yet

Do not implement

 Resume Parsing

 Dashboard Logic

 AI Career Brain

 Job Discovery

 Job Matching

 Resume Optimizer

 Cover Letter Generator

 Interview Preparation

 Learning Engine

 Career Coach

 Recruiter CRM

 Auto Apply

 Billing Logic

 Analytics Logic

 Admin Logic

Only prepare the infrastructure.✅ Final Acceptance Checklist (Phase 1)

By the end of Phase 1 the application must provide:

Foundation

 Production project architecture

 Feature-first folder structure

 Clean code organization

Authentication

 Google OAuth

 GitHub OAuth

 Email & Password

 Secure sessions

 Protected routes

 RBAC

Backend

 Supabase integration

 Database foundation

 Storage foundation

 Service architecture

UI

 Premium landing page

 Design system

 Reusable components

 Application shell

 Navigation

 Sidebar

 Header

 Command Palette

 Responsive layouts

 Accessibility

 Motion system

Infrastructure

 Providers

 Middleware

 Logging

 Error handling

 Security

 Performance optimization

 SEO foundation

 Testing setup

 Documentation

 Git workflow

🎯 End Goal

At the completion of Phase 1, CareerOS should feel like a polished, premium SaaS platform with a complete production-ready foundation. Users should be able to:

 Visit a stunning landing page.

 Create an account using Google, GitHub, or email.

 Verify their account.

 Sign in securely.

 Access a protected application shell.

 Experience a consistent, premium interface ready for the AI-powered features that will be implemented in Phases 2–8.

This completes Phase 1. From Phase 2 onward, we begin implementing the actual AI-powered career intelligence features on top of this solid foundation.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://career-spark-ai-123.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4c862a93-1fb0-491e-8ffe-1bfd363f7f37).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
