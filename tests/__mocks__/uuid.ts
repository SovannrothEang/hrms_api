// Mock uuid module for Jest compatibility
export const v4 = jest.fn(() => 'mocked-uuid-v4');
export const v1 = jest.fn(() => 'mocked-uuid-v1');
export default { v4, v1 };
