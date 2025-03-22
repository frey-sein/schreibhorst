# Schreibhorst

## About
Schreibhorst is a content creation assistant that combines conversational AI with powerful content generation capabilities. The application features a dual-panel interface with a chat interface on the left and a "stage" on the right. 

Users can research topics through natural conversation (utilizing MCP tools under the hood like scraping, web research, etc.) and then move the resulting prompts to the stage where they are executed to generate various types of content (images, text, video, etc.). This content can then be assembled into posts for social media platforms like Instagram, LinkedIn, and website blogs (e.g., WordPress).

## Core Features

### LLM Chat
- Input window with completion
- Model selection (manual + automatic)
- Integration with Open Router algorithms

### Research Process
- Conversational interface for topic exploration
- Manual selection of completions (Toggle Green Checkmark)
- Background tools for web research, information retrieval, and fact-checking

### Chat Analyzer
- Content analysis of conversations to identify key themes, topics, and concepts
- Extraction of potential prompts for content generation
- Detection of creative intents and content preferences expressed by users
- Transformation of conversational elements into structured generation prompts
- Ranking system for evaluating prompt quality and relevance
- Bridge between conversation interface and content generation tools

### Staging Area
- Content display and organization
- Options to fix, regenerate, or manually edit content
- Support for text, images, and potentially video

### Export & Archive
- Download functionality for created content
- Archiving system for past projects
- Export formats compatible with various platforms

## Development Todos

- [x] Set up Next.js project structure
- [x] Implement basic UI layout with chat panel and stage panel
- [x] Create chat interface with input and completion display
- [ ] Integrate with MCP tools for enhanced conversation capabilities
- [ ] Implement model selection and algorithm integration
- [ ] Implement an analyzer for the chat to generate prompts that can be sent to the stage where they will be used as OpenRouter inputs for content generation (text and image generation)
  - [ ] Build content analysis system to identify key topics and concepts
  - [ ] Create algorithm for extracting and formulating generation prompts
  - [ ] Implement intent detection to identify creative requests
  - [ ] Develop a ranking system for potential prompts
  - [ ] Design the interface between chat analysis and stage components
- [ ] Create "move to stage" functionality
- [x] Build stage interface with content display and editing options
- [ ] Implement content generation features (text, image, etc.)
- [ ] Create export functionality for various platforms
- [ ] Design and implement archiving system
- [ ] Add authentication and user management
- [ ] Create settings and preferences panel
- [x] Implement responsive design for various devices
- [ ] Add documentation and help resources
- [ ] Set up testing infrastructure
- [ ] Implement error handling and logging
