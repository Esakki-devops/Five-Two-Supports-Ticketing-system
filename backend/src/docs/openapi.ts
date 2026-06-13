import { config } from '../core/config/index';

const P = config.http.apiPrefix;

const bearer = [{ bearerAuth: [] }];
const ok = (description: string) => ({ description });

/** Hand-authored OpenAPI 3.0 contract served at /docs. Kept in sync with the routers. */
export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Five Two Supports — Ticketing API',
    version: '1.0.0',
    description:
      'Internal ticketing platform API. All responses use the envelope `{ success, data?, error?, meta? }`. Protected routes require a Bearer access token.',
  },
  servers: [{ url: '/', description: 'This host' }],
  tags: [
    { name: 'System' },
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Tickets' },
    { name: 'Attachments' },
    { name: 'Reference data' },
    { name: 'Notifications' },
    { name: 'Dashboard' },
    { name: 'Export' },
  ],
  security: bearer,
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: {},
              requestId: { type: 'string' },
            },
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['employee', 'engineer'] },
          status: { type: 'string', enum: ['pending', 'active', 'rejected', 'disabled'] },
          department: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Ticket: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          ticketNumber: { type: 'string', example: 'TKT-000123' },
          title: { type: 'string' },
          description: { type: 'string' },
          status: {
            type: 'string',
            enum: ['new', 'open', 'in_progress', 'on_hold', 'resolved', 'closed', 'reopened'],
          },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          isInternal: { type: 'boolean' },
          requester: { $ref: '#/components/schemas/User' },
          assignee: { $ref: '#/components/schemas/User', nullable: true },
          department: { type: 'object' },
          category: { type: 'object' },
          comments: { type: 'array', items: { type: 'object' } },
          activity: { type: 'array', items: { type: 'object' } },
          attachments: { type: 'array', items: { type: 'object' } },
          createdAt: { type: 'string', format: 'date-time' },
          resolvedAt: { type: 'string', format: 'date-time', nullable: true },
          closedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Department: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          isActive: { type: 'boolean' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          department: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          message: { type: 'string' },
          ticket: { type: 'string', nullable: true },
          isRead: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: { tags: ['System'], summary: 'Liveness', security: [], responses: { 200: ok('OK') } },
    },
    '/ready': {
      get: {
        tags: ['System'],
        summary: 'Readiness (Mongo/Redis/storage)',
        security: [],
        responses: { 200: ok('Ready'), 503: ok('Degraded') },
      },
    },
    [`${P}/auth/register`]: {
      post: {
        tags: ['Auth'],
        summary: 'Self-register (→ pending)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'department'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  department: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: ok('Created (pending approval)'),
          409: ok('Email taken'),
          422: ok('Invalid'),
        },
      },
    },
    [`${P}/auth/login`]: {
      post: {
        tags: ['Auth'],
        summary: 'Login (status-gated). Sets the refresh cookie; returns the access token.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: ok('Authenticated'), 401: ok('Bad credentials'), 403: ok('Not active') },
      },
    },
    [`${P}/auth/refresh`]: {
      post: {
        tags: ['Auth'],
        summary: 'Rotate tokens via the refresh cookie',
        security: [],
        responses: { 200: ok('Refreshed'), 401: ok('Invalid') },
      },
    },
    [`${P}/auth/logout`]: {
      post: {
        tags: ['Auth'],
        summary: 'Clear the refresh cookie',
        security: [],
        responses: { 200: ok('Logged out') },
      },
    },
    [`${P}/auth/me`]: {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        responses: { 200: ok('Profile'), 401: ok('Unauthorized') },
      },
    },
    [`${P}/auth/forgot-password`]: {
      post: {
        tags: ['Auth'],
        summary: 'Request a password reset',
        security: [],
        responses: { 200: ok('Always 200') },
      },
    },
    [`${P}/auth/reset-password`]: {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with a token',
        security: [],
        responses: { 200: ok('Reset'), 400: ok('Invalid token') },
      },
    },
    [`${P}/users`]: {
      get: {
        tags: ['Users'],
        summary: 'List users (engineer)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: ok('Users'), 403: ok('Forbidden') },
      },
      post: {
        tags: ['Users'],
        summary: 'Admin-create an active user (engineer)',
        responses: { 201: ok('Created') },
      },
    },
    [`${P}/users/{id}/approve`]: {
      patch: {
        tags: ['Users'],
        summary: 'Approve a registration (engineer)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok('Approved') },
      },
    },
    [`${P}/users/{id}/reject`]: {
      patch: {
        tags: ['Users'],
        summary: 'Reject a registration (engineer)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok('Rejected') },
      },
    },
    [`${P}/users/{id}/status`]: {
      patch: {
        tags: ['Users'],
        summary: 'Enable/disable or change role (engineer)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok('Updated') },
      },
    },
    [`${P}/tickets`]: {
      get: {
        tags: ['Tickets'],
        summary: 'List tickets (role-scoped, projected, paginated)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'department', in: 'query', schema: { type: 'string' } },
          { name: 'assignee', in: 'query', schema: { type: 'string' } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'sort', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: ok('Tickets') },
      },
      post: {
        tags: ['Tickets'],
        summary: 'Create a ticket (employee=self; engineer=self/on-behalf/internal)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description', 'department', 'category'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  department: { type: 'string' },
                  category: { type: 'string' },
                  priority: { type: 'string' },
                  requester: { type: 'string' },
                  isInternal: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { 201: ok('Created') },
      },
    },
    [`${P}/tickets/{id}`]: {
      get: {
        tags: ['Tickets'],
        summary: 'Get a ticket',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok('Ticket'), 404: ok('Not found') },
      },
      patch: {
        tags: ['Tickets'],
        summary: 'Update (validated status transition; engineer fields)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok('Updated'), 400: ok('Invalid transition'), 403: ok('Forbidden') },
      },
      delete: {
        tags: ['Tickets'],
        summary: 'Soft delete (engineer)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok('Deleted') },
      },
    },
    [`${P}/tickets/{id}/assign`]: {
      patch: {
        tags: ['Tickets'],
        summary: 'Assign to an engineer (engineer)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok('Assigned') },
      },
    },
    [`${P}/tickets/{id}/comments`]: {
      post: {
        tags: ['Tickets'],
        summary: 'Add a comment',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: ok('Commented') },
      },
    },
    [`${P}/tickets/{id}/attachments`]: {
      post: {
        tags: ['Attachments'],
        summary: 'Upload files (multipart; 20 MB; validated)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  files: { type: 'array', items: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
        },
        responses: { 201: ok('Uploaded'), 400: ok('Rejected type') },
      },
    },
    [`${P}/tickets/{id}/attachments/{attId}`]: {
      get: {
        tags: ['Attachments'],
        summary: 'Download (blocked until scanned clean)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'attId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: ok('File stream'), 409: ok('Still scanning') },
      },
    },
    [`${P}/departments`]: {
      get: {
        tags: ['Reference data'],
        summary: 'List departments (public; active by default)',
        security: [],
        parameters: [{ name: 'includeInactive', in: 'query', schema: { type: 'boolean' } }],
        responses: { 200: ok('Departments') },
      },
      post: {
        tags: ['Reference data'],
        summary: 'Create a department (engineer)',
        responses: { 201: ok('Created'), 409: ok('Duplicate') },
      },
    },
    [`${P}/departments/{id}`]: {
      patch: {
        tags: ['Reference data'],
        summary: 'Update/deactivate a department (engineer)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok('Updated') },
      },
    },
    [`${P}/categories`]: {
      get: {
        tags: ['Reference data'],
        summary: 'List categories (public)',
        security: [],
        parameters: [
          { name: 'includeInactive', in: 'query', schema: { type: 'boolean' } },
          { name: 'department', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: ok('Categories') },
      },
      post: {
        tags: ['Reference data'],
        summary: 'Create a category (engineer)',
        responses: { 201: ok('Created') },
      },
    },
    [`${P}/categories/{id}`]: {
      patch: {
        tags: ['Reference data'],
        summary: 'Update/deactivate a category (engineer)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok('Updated') },
      },
    },
    [`${P}/notifications`]: {
      get: {
        tags: ['Notifications'],
        summary: 'List own notifications (+ unreadCount)',
        parameters: [
          { name: 'unreadOnly', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: ok('Notifications') },
      },
    },
    [`${P}/notifications/{id}/read`]: {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark one read',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: ok('Read') },
      },
    },
    [`${P}/notifications/read-all`]: {
      patch: { tags: ['Notifications'], summary: 'Mark all read', responses: { 200: ok('Read') } },
    },
    [`${P}/dashboard/summary`]: {
      get: {
        tags: ['Dashboard'],
        summary: 'Role-aware metrics (counts + MTTR)',
        responses: { 200: ok('Summary') },
      },
    },
    [`${P}/export`]: {
      get: {
        tags: ['Export'],
        summary: 'Stream tickets as CSV/XLSX (engineer)',
        parameters: [
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'xlsx'] } },
        ],
        responses: { 200: ok('File stream'), 403: ok('Forbidden') },
      },
    },
  },
} as const;
