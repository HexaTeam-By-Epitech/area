// Global Jest setup to mock Nodemailer for all tests
// Ensures no real SMTP calls are made anywhere in the test suite

const mockTransporter = {
  sendMail: jest.fn(),
  verify: jest.fn(),
};

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => mockTransporter),
}));

export {};
