# Byte-Me-Hack

<<<<<<< HEAD
An AI-powered chat application built with Next.js, Socket.IO, and Hugging Face.

## Features

- Real-time messaging with Socket.IO
- AI-powered message suggestions using Hugging Face models
- OAuth authentication with GitHub and Google
- Emoji reactions to messages
- Private and public chat rooms
- Modern UI with Tailwind CSS
=======
A modern chat application built with Next.js, featuring AI-powered features like smart message suggestions, real-time translation, and content moderation.

## Features

- 🔒 Secure authentication with NextAuth.js
- 💬 Real-time messaging with Socket.IO
- 🤖 AI-powered message suggestions
- 🌍 Real-time message translation
- 🛡️ Content moderation
- 🎨 Modern UI with Tailwind CSS
- 📱 Responsive design
- 🔔 Real-time notifications
- 👥 User presence system
- 💾 PostgreSQL database with Prisma ORM

## Prerequisites

- Node.js 16+ and npm
- PostgreSQL database
- Hugging Face API key

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/byte-me-hack.git
   cd byte-me-hack
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:

> **Note:** Double-check all variable names and ensure your `.env` file is in the project root directory.

```env
DATABASE_URL="postgresql://user:password@localhost:5432/byte_me_hack"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# OAuth providers
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"
GOOGLE_ID="your-google-client-id"
GOOGLE_SECRET="your-google-client-secret"

# Hugging Face
NEXT_PUBLIC_HUGGINGFACE_API_KEY="your-huggingface-api-key"
```

4. Set up the database:
```bash
npx prisma db push
```

5. Start the development server:
```bash
npm run dev
```

## Project Structure

```
byte-me-hack/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   ├── chatrooms/
│   │   ├── messages/
│   │   └── socket/
│   ├── components/
│   │   ├── Chat/
│   │   ├── User/
│   │   └── Profile/
│   ├── hooks/
│   └── lib/
├── prisma/
└── public/
```

## Technologies Used

- Next.js 13 with App Router
- TypeScript
- Prisma with PostgreSQL
- Socket.IO for real-time communication
- NextAuth.js for authentication
- Hugging Face for AI features
- Tailwind CSS for styling
- Lucide React for icons
- Date-fns for date formatting
- Emoji Picker React for emoji selection

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


