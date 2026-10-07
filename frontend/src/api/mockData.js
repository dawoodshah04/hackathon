// Development-only fixtures for the mock API (VITE_USE_MOCK=true).
// Never imported by the real request path.

export const MOCK_USERS = [
  { id: 'ADMIN', name: 'Admin', email: 'admin@novaworks.example', role: 'ADMIN', specialization: 'Administrator', skills: ['Company overview', 'Transcript creation'] },
  { id: 'PM01', name: 'Ayesha Khan', email: 'ayesha@novaworks.example', role: 'MANAGER', specialization: 'Web PM', skills: ['Web projects', 'Client coordination'] },
  { id: 'PM02', name: 'Bilal Ahmed', email: 'bilal@novaworks.example', role: 'MANAGER', specialization: 'Mobile PM', skills: ['Mobile projects', 'Delivery planning'] },
  { id: 'PM03', name: 'Hina Malik', email: 'hina@novaworks.example', role: 'MANAGER', specialization: 'AI PM', skills: ['AI projects', 'Requirement review'] },
  { id: 'DEV01', name: 'Ali Raza', email: 'ali@novaworks.example', role: 'AGENT', specialization: 'Full-Stack', skills: ['React', 'Frontend integration'] },
  { id: 'DEV02', name: 'Hamza Shah', email: 'hamza@novaworks.example', role: 'AGENT', specialization: 'Full-Stack', skills: ['Node.js', 'Databases', 'APIs'] },
  { id: 'DEV03', name: 'Sara Noor', email: 'sara@novaworks.example', role: 'AGENT', specialization: 'App Developer', skills: ['Flutter', 'Mobile UI'] },
  { id: 'DEV04', name: 'Usman Tariq', email: 'usman@novaworks.example', role: 'AGENT', specialization: 'App Developer', skills: ['Flutter', 'Integration', 'Testing'] },
  { id: 'DEV05', name: 'Zain Abbas', email: 'zain@novaworks.example', role: 'AGENT', specialization: 'AI Developer', skills: ['LLMs', 'Extraction', 'Prompts'] },
  { id: 'DEV06', name: 'Maryam Asif', email: 'maryam@novaworks.example', role: 'AGENT', specialization: 'AI Developer', skills: ['Retrieval', 'Document processing'] },
]

export const MOCK_PASSWORD = 'Demo123!'

/** A draft in the contract's section 8 shape; also used to seed the mock database. */
export const MOCK_DRAFT = {
  projects: [
    {
      name: 'UrbanCart Website',
      clientName: 'UrbanCart Clothing',
      description:
        'Responsive storefront demo for UrbanCart Clothing with a browsable product catalog, a demo cart and the APIs behind them.',
      managerId: 'PM01',
      deadline: '2026-10-20',
      tasks: [
        { title: 'Product catalog UI', description: 'Build the responsive catalog page with product cards, category filters and a product detail view in React.', assigneeId: 'DEV01', deadline: '2026-10-12', estimatedHours: 12 },
        { title: 'Demo cart UI', description: 'Cart drawer with quantity changes, removal and an order summary. No real payment step.', assigneeId: 'DEV01', deadline: '2026-10-15', estimatedHours: 8 },
        { title: 'Product and cart APIs', description: 'REST endpoints for products and cart sessions backed by the database, with basic input validation.', assigneeId: 'DEV02', deadline: '2026-10-14', estimatedHours: 14 },
        { title: 'Website integration and testing', description: 'Connect the UI to the APIs, fix integration issues and run an end-to-end pass on desktop and mobile widths.', assigneeId: 'DEV01', deadline: '2026-10-19', estimatedHours: 6 },
      ],
    },
    {
      name: 'QuickServe Mobile App',
      clientName: 'QuickServe Services',
      description: 'Single Flutter codebase for booking home services: sign-in, customer profile and the service booking flow.',
      managerId: 'PM02',
      deadline: '2026-10-24',
      tasks: [
        { title: 'Login and profile screens', description: 'Sign-in, registration form and an editable customer profile screen in Flutter.', assigneeId: 'DEV03', deadline: '2026-10-12', estimatedHours: 8 },
        { title: 'Service booking screens', description: 'Service list, time-slot picker and booking confirmation screens.', assigneeId: 'DEV03', deadline: '2026-10-17', estimatedHours: 12 },
        { title: 'Booking and account APIs', description: 'Endpoints for accounts, available slots and bookings used by the mobile app.', assigneeId: 'DEV02', deadline: '2026-10-16', estimatedHours: 16 },
        { title: 'Mobile integration and testing', description: 'Wire the screens to the APIs and test the full booking journey on Android and iOS builds.', assigneeId: 'DEV04', deadline: '2026-10-22', estimatedHours: 10 },
      ],
    },
    {
      name: 'HelpDeskPro AI Assistant',
      clientName: 'HelpDeskPro Solutions',
      description:
        "Support assistant that answers customer questions from the client's FAQ documents and hands off to a human when it is unsure.",
      managerId: 'PM03',
      deadline: '2026-10-22',
      tasks: [
        { title: 'FAQ document processing', description: 'Ingest and chunk the FAQ documents and build the retrieval index.', assigneeId: 'DEV06', deadline: '2026-10-13', estimatedHours: 10 },
        { title: 'Assistant answer generation', description: 'Prompting and answer generation grounded in retrieved FAQ passages, with source references.', assigneeId: 'DEV05', deadline: '2026-10-17', estimatedHours: 14 },
        { title: 'Human escalation flow', description: 'Detect low-confidence answers and route the conversation to a human agent with context.', assigneeId: 'DEV05', deadline: '2026-10-18', estimatedHours: 6 },
        { title: 'Assistant evaluation and testing', description: 'Build a question set, measure answer quality and test the escalation path.', assigneeId: 'DEV06', deadline: '2026-10-21', estimatedHours: 8 },
      ],
    },
  ],
}
