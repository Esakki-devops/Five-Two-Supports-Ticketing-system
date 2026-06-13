import type { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '../../core/http/envelope';
import { buildPaginationMeta } from '../../core/http/pagination';
import { getBody, getParams, getQuery } from '../../core/middleware/validate';
import * as ticketService from './ticket.service';
import type {
  AddCommentInput,
  AssignTicketInput,
  CreateTicketInput,
  ListTicketsQuery,
  TicketIdParams,
  UpdateTicketInput,
} from './ticket.schemas';

export async function create(req: Request, res: Response): Promise<Response> {
  const ticket = await ticketService.createTicket(req.auth!, getBody<CreateTicketInput>(req));
  return sendSuccess(res, { ticket }, { status: 201 });
}

export async function list(req: Request, res: Response): Promise<Response> {
  const { items, total, page, limit } = await ticketService.listTickets(
    req.auth!,
    getQuery<ListTicketsQuery>(req),
  );
  return sendPaginated(res, items, buildPaginationMeta(total, page, limit));
}

export async function getOne(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<TicketIdParams>(req);
  return sendSuccess(res, { ticket: await ticketService.getTicket(req.auth!, id) });
}

export async function update(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<TicketIdParams>(req);
  const ticket = await ticketService.updateTicket(req.auth!, id, getBody<UpdateTicketInput>(req));
  return sendSuccess(res, { ticket });
}

export async function assign(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<TicketIdParams>(req);
  const ticket = await ticketService.assignTicket(req.auth!, id, getBody<AssignTicketInput>(req));
  return sendSuccess(res, { ticket });
}

export async function comment(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<TicketIdParams>(req);
  const ticket = await ticketService.addComment(req.auth!, id, getBody<AddCommentInput>(req));
  return sendSuccess(res, { ticket }, { status: 201 });
}

export async function remove(req: Request, res: Response): Promise<Response> {
  const { id } = getParams<TicketIdParams>(req);
  await ticketService.deleteTicket(req.auth!, id);
  return sendSuccess(res, { message: 'Ticket deleted.' });
}
