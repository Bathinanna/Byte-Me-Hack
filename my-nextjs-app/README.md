# My Next.js Chat Application

This is a chat application built with Next.js, utilizing NextAuth.js for authentication and Prisma for database interactions.

## Features

- User authentication with NextAuth.js
- Real-time chatrooms
- User profiles with images and emails
- Responsive design

## Project Structure

```
my-nextjs-app
├── app
│   ├── api
│   │   └── auth
│   │       └── [...nextauth]
│   │           └── route.ts
│   ├── chat
│   │   └── page.tsx
│   ├── components
│   │   └── ChatDashboard.tsx
│   └── lib
│       └── prisma.ts
├── pages
│   └── index.tsx
├── public
│   └── favicon.ico
├── styles
│   └── global.css
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd my-nextjs-app
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Set up your environment variables in a `.env` file (refer to `.env.example` for guidance).

5. Run the development server:
   ```
   npm run dev
   ```

## Usage

- Visit `http://localhost:3000` to access the application.
- Users can sign up or log in to access chatrooms.

## Contributing

Feel free to submit issues or pull requests for any features or improvements.

## License

This project is licensed under the MIT License.