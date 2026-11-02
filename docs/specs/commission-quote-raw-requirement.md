# Commission Quote

**DO NOT** modify this file.

## Context

In a Bank Lending Platform, staff members frequently need to generate "Commission Quotes" based on loan applications. To do this, our system needs to process loan details and send them to an external third-party vendor Commission Quote API, which calculates the commission and returns a quote.

Currently, the external third-party vendor Commission Quote API is under construction and not yet available. However, the API contract and authentication requirements have been finalized. We need to unblock our development by building our application against a mock version of this API.

## Tasks

The task is to build a web application that allows a user to input loan details and displays the generated commission quote, along with a mock version of this third-party vendor Commission Quote API that simulates the external vendor.

### Web application requirements

- A user interface with a form to capture basic loan details (e.g., loanAmount, loanTermInMonths, riskBand).
- A "Generate Quote" button.
- A display area to show the resulting quote data when the request is successful.
- Proper loading states and error messages if the quote generation fails.

### Third-party vendor Commission Quote API requirements

- Contract: It must accept and return data based on this agreed contract:
  - Request payload: loanAmount, loanTermInMonths, riskBand (LOW, MEDIUM, HIGH)
  - Response payload: quoteId, commissionRate, totalCommission

- Security: The third-party vendor Commission Quote API is strictly secured. It must require an api-key header to process the request. Any request without a valid API key should be rejected.

- Simulation: To mimic real-world network conditions, your Commission Quote API must occasionally (randomly) throw an error.

## Basic tech requirements

### Tech stacks can be used (Choose a tech stack you are most comfortable with)

- React and TypeScript
- Node.js BFF services
- REST and GraphQL APIs
- Java and SpringBoot microservices
- Camunda workflow
- AWS cloud infrastructure
- Google Gemini AI stack

### Must-haves:

- Treat this as the foundation of a real app.
- **Solve the core problem correctly:** The web application successfully captures input, securely communicates with the Commission Quote API, and gracefully handles the response (both success and failure).
- **Keep the code readable and structured clearly:** We look for sensible directory structures, clean abstractions, and good separation of concerns.
- **Include core tests:** We don't need 100% coverage, but please include a few unit or integration tests for the ones you think matter most.
- **Handle key edge cases:** What happens if the user submits invalid numbers? What happens when the Commission Quote API times out or throws an error?
- **Use appropriate security and API handling:** Consider the security of the integration and how errors and authentication should be handled.
- **Make sensible code decisions:** Treat this as the foundation of a real app. Choose a tech stack you are most comfortable with.
- **Follow good engineering practices:** Approach this challenge as you would a real development task.
- **Include run instructions:** Provide a `README.md` with clear, step-by-step instructions on how to start the application components and run the tests.

### Nice-to-haves:

- **UI Polish:** A clean, accessible and responsive UI is appreciated, but UI polish is not a core part of the assessment. Using basic CSS or a component library is completely fine.
