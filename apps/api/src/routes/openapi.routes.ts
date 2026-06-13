/**
 * src/routes/openapi.routes.ts — OpenAPI/Swagger spec for the API.
 * Served at /api/openapi.json (public).
 */

import { Router, Request, Response } from 'express';

export const openApiRouter = Router();

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Unify Platform API',
    version: '1.0.0',
    description: 'Integrated University Assistant Platform — Persian/RTL web application API',
  },
  servers: [{ url: '/api', description: 'Current server' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      APIError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
            },
          },
          requestId: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          role: { type: 'string', enum: ['STUDENT', 'PROFESSOR', 'EXPERT', 'HEAD_OF_DEPARTMENT', 'SYSTEM_ADMIN', 'SYSTEM_OWNER'] },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              role: { type: 'string' },
              onboardingComplete: { type: 'boolean' },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check (public)',
        security: [],
        responses: {
          '200': { description: 'Service is healthy' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login with username and password',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
          },
          '401': {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/APIError' } } },
          },
          '429': { description: 'Too many login attempts' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        security: [],
        responses: { '200': { description: 'New access token issued' } },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change password for current user',
        responses: { '200': { description: 'Password changed' } },
      },
    },
    '/onboarding': {
      post: {
        tags: ['Auth'],
        summary: 'Complete onboarding (first login)',
        responses: { '200': { description: 'Onboarding completed' } },
      },
    },
    '/users/me': {
      get: { tags: ['Users'], summary: 'Get current user profile', responses: { '200': { description: 'Profile' } } },
    },
    '/system/state': {
      get: { tags: ['System'], summary: 'Get current semester and phase', responses: { '200': { description: 'System state' } } },
    },
    '/scheduler/state': {
      get: { tags: ['Scheduler'], summary: 'Get scheduler state for current student', responses: { '200': { description: 'Scheduler state' } } },
    },
    '/scheduler/search': {
      get: {
        tags: ['Scheduler'],
        summary: 'Search specifications',
        parameters: [{ in: 'query', name: 'q', schema: { type: 'string' } }],
        responses: { '200': { description: 'Matching specifications' } },
      },
    },
    '/scheduler/temp-add': {
      post: {
        tags: ['Scheduler'],
        summary: 'Add specification to temporary list',
        responses: { '200': { description: 'Added or warnings returned' } },
      },
    },
    '/scheduler/submit': {
      post: { tags: ['Scheduler'], summary: 'Submit final list (locks enrollment)', responses: { '200': { description: 'Submitted' } } },
    },
    '/scheduler/golden-schedule': {
      post: { tags: ['Scheduler'], summary: 'Generate Golden Schedule combinations', responses: { '200': { description: 'Combinations' } } },
    },
    '/resources': {
      get: {
        tags: ['Resources'],
        summary: 'List resource files for course+professor',
        parameters: [
          { in: 'query', name: 'courseId', schema: { type: 'string' } },
          { in: 'query', name: 'professorId', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Files' } },
      },
    },
    '/resources/upload': {
      post: { tags: ['Resources'], summary: 'Upload a file', responses: { '200': { description: 'File uploaded' } } },
    },
    '/tickets': {
      get: { tags: ['Tickets'], summary: 'List user tickets', responses: { '200': { description: 'Tickets' } } },
      post: { tags: ['Tickets'], summary: 'Create new ticket', responses: { '200': { description: 'Created' } } },
    },
    '/inbox': {
      get: { tags: ['Inbox'], summary: 'Get message threads', responses: { '200': { description: 'Threads' } } },
    },
    '/messages/broadcast': {
      post: { tags: ['Messages'], summary: 'Broadcast message to class (professor only)', responses: { '200': { description: 'Sent' } } },
    },
    '/admin/phase': {
      patch: { tags: ['Admin'], summary: 'Change system phase', responses: { '200': { description: 'Phase changed' } } },
    },
    '/owner/users': {
      post: { tags: ['Owner'], summary: 'Create new user', responses: { '200': { description: 'Created with generated password' } } },
    },
    '/owner/audit': {
      get: { tags: ['Owner'], summary: 'Query audit logs', responses: { '200': { description: 'Audit log entries' } } },
    },
    '/owner/analytics': {
      get: { tags: ['Owner'], summary: 'Get analytics dashboard data', responses: { '200': { description: 'Analytics' } } },
    },
    '/departments': {
      get: { tags: ['Admin'], summary: 'List departments', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Departments' } } },
      post: { tags: ['Owner'], summary: 'Create department (Owner only)', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Created' } } },
    },
    '/cancelled-notices/me/active': {
      get: { tags: ['Student'], summary: 'Get active cancelled-spec notices for current student', responses: { '200': { description: 'Active notices' } } },
    },
    '/notifications/register-device': {
      post: { tags: ['Notifications'], summary: 'Register a Pushe push notification device token', responses: { '200': { description: 'Device registered' } } },
    },
    '/notifications/preferences': {
      get: { tags: ['Student'], summary: 'Get mute preferences for current student', responses: { '200': { description: 'Preferences' } } },
      post: { tags: ['Student'], summary: 'Update a per-specification mute preference', responses: { '200': { description: 'Updated' } } },
    },
    '/profile/me/photo': {
      post: { tags: ['User'], summary: 'Upload profile photo (max 5MB, JPEG/PNG/WebP)', responses: { '200': { description: 'Photo uploaded' } } },
      delete: { tags: ['User'], summary: 'Delete profile photo', responses: { '200': { description: 'Photo deleted' } } },
    },
    '/pending': {
      get: { tags: ['Staff'], summary: 'List pending student file uploads awaiting approval (filtered by role)', responses: { '200': { description: 'Pending files' } } },
    },
    '/expert/courses/{courseId}/prerequisites': {
      get: { tags: ['Expert'], summary: 'List prerequisites and co-requisites for a course' },
      post: { tags: ['Expert'], summary: 'Add a prerequisite relationship' },
      delete: { tags: ['Expert'], summary: 'Remove a prerequisite' },
    },
    '/templates/user-bulk-upload.xlsx': {
      get: { tags: ['Owner'], summary: 'Download Excel template for bulk user upload (public)', security: [], responses: { '200': { description: 'XLSX file' } } },
    },
    '/assignments': {
      get: { tags: ['Student'], summary: 'List student assignment tasks (with optional course)', responses: { '200': { description: 'Tasks' } } },
      post: { tags: ['Student'], summary: 'Create assignment task with optional courseId (Golden Doc §2.6.4)', responses: { '200': { description: 'Created' } } },
    },
  },
};

openApiRouter.get('/', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

openApiRouter.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});
