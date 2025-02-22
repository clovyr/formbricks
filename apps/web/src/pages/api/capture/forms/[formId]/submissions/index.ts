import { runPipelines } from "@/lib/pipelinesHandler";
import { capturePosthogEvent } from "@/lib/posthog";
import { captureTelemetry } from "@/lib/telemetry";
import { prisma } from "@formbricks/database";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
  const formId = req.query.formId.toString();

  // CORS
  if (req.method === "OPTIONS") {
    res.status(200).end();
  }

  // POST/capture/forms/[formId]/submissions
  // Create a new form submission
  // Required fields in body: -
  // Optional fields in body: customerId, data
  else if (req.method === "POST") {
    const submission = req.body;

    // get form
    const form = await prisma.form.findUnique({
      where: { id: formId },
    });

    if (form === null) {
      return res.status(404).json({ error: `Form with id "${formId}" not found` });
    }

    const event: any = {
      data: {
        data: submission.data,
        form: { connect: { id: formId } },
        meta: { userAgent: req.headers["user-agent"] },
      },
    };

    if (submission.finished) {
      event.data.finished = submission.finished;
    }

    if (submission.customer && "email" in submission.customer) {
      const customerEmail = submission.customer.email;
      const customerData = { ...submission.customer };
      delete customerData.email;
      const existingCustomer = await prisma.customer.findUnique({
        where: {
          email_organisationId: {
            email: submission.customer.email,
            organisationId: form.organisationId,
          },
        },
      });
      if (existingCustomer) {
        let newCustomerData = { ...customerData };
        if (existingCustomer.data && typeof existingCustomer.data === "object") {
          newCustomerData = { ...existingCustomer.data, ...customerData };
        }
        // update customer
        await prisma.customer.update({
          where: {
            email_organisationId: {
              email: submission.customer.email,
              organisationId: form.organisationId,
            },
          },
          data: {
            data: newCustomerData,
          },
        });
        event.data.customer = {
          connect: { email_organisationId: { email: customerEmail, organisationId: form.organisationId } },
        };
      } else {
        // create customer
        event.data.customer = {
          create: {
            email: customerEmail,
            organisation: { connect: { id: form.organisationId } },
            data: customerData,
          },
        };
      }
    }

    // create form in db
    const pipelineEvents = ["submissionCreated"];
    if (submission.finished) {
      pipelineEvents.push("submissionFinished");
    }
    // create submission
    const submissionResult = await prisma.submission.create(event);
    // run pipelines
    await runPipelines(pipelineEvents, form, submission, submissionResult);
    // tracking
    capturePosthogEvent(form.organisationId, "submission received", {
      formId,
    });
    captureTelemetry("submission received");
    res.json(submissionResult);
  }

  // Unknown HTTP Method
  else {
    throw new Error(`The HTTP ${req.method} method is not supported by this route.`);
  }
}
