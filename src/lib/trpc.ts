/* eslint-disable @typescript-eslint/no-explicit-any */
import { createTRPCReact } from '@trpc/react-query'

// TODO: replace `any` with shared TRPCRouter type alias from @poker/trpc after A1 is ready.
export const trpc = createTRPCReact<any>() as any
