import { Router } from 'express';
import { asyncHandler } from '../../core/http/asyncHandler';
import { authenticate } from '../../core/middleware/authenticate';
import { authorize } from '../../core/middleware/authorize';
import { validate } from '../../core/middleware/validate';
import { Role } from '../../common/types/index';
import { uploadAttachments } from '../../core/middleware/upload';
import * as ctrl from './ticket.controller';
import * as attachmentCtrl from './attachment.controller';
import {
  addCommentSchema,
  assignTicketSchema,
  attachmentParamsSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdParamsSchema,
  updateTicketSchema,
} from './ticket.schemas';

export const ticketRouter: Router = Router();

// Every ticket route requires authentication; per-action scoping is enforced in the service.
ticketRouter.use(authenticate);

ticketRouter.get('/', validate({ query: listTicketsQuerySchema }), asyncHandler(ctrl.list));
ticketRouter.post('/', validate({ body: createTicketSchema }), asyncHandler(ctrl.create));
ticketRouter.get('/:id', validate({ params: ticketIdParamsSchema }), asyncHandler(ctrl.getOne));
ticketRouter.patch(
  '/:id',
  validate({ params: ticketIdParamsSchema, body: updateTicketSchema }),
  asyncHandler(ctrl.update),
);
ticketRouter.patch(
  '/:id/assign',
  authorize(Role.Engineer),
  validate({ params: ticketIdParamsSchema, body: assignTicketSchema }),
  asyncHandler(ctrl.assign),
);
ticketRouter.post(
  '/:id/comments',
  validate({ params: ticketIdParamsSchema, body: addCommentSchema }),
  asyncHandler(ctrl.comment),
);
ticketRouter.post(
  '/:id/attachments',
  validate({ params: ticketIdParamsSchema }),
  uploadAttachments,
  asyncHandler(attachmentCtrl.upload),
);
ticketRouter.get(
  '/:id/attachments/:attId',
  validate({ params: attachmentParamsSchema }),
  asyncHandler(attachmentCtrl.download),
);
ticketRouter.delete(
  '/:id',
  authorize(Role.Engineer),
  validate({ params: ticketIdParamsSchema }),
  asyncHandler(ctrl.remove),
);
