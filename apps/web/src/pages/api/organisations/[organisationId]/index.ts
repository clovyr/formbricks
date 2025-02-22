import { getSessionOrUser } from "@/lib/apiHelper";
import { prisma } from "@formbricks/database";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  // Check Authentication
  const user: any = await getSessionOrUser(req, res);
  if (!user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const organisationId = req.query.organisationId.toString();

  // GET /api/organisations[organisationId]
  // Get a specific organisation
  if (req.method === "GET") {
    // check if membership exists
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organisationId: {
          userId: user.id,
          organisationId,
        },
      },
    });
    if (membership === null) {
      return res
        .status(403)
        .json({ message: "You don't have access to this organisation or this organisation doesn't exist" });
    }
    const organisation = await prisma.organisation.findUnique({
      where: {
        id: organisationId,
      },
    });
    return res.json(organisation);
  }

  // Unknown HTTP Method
  else {
    throw new Error(`The HTTP ${req.method} method is not supported by this route.`);
  }
}
