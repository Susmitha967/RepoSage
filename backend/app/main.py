from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import profile, repos, suggestions, deep_dive, readme_gen, discover, chat

app = FastAPI(title="RepoSage API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(repos.router)
app.include_router(suggestions.router)
app.include_router(deep_dive.router)
app.include_router(readme_gen.router)
app.include_router(discover.router)
app.include_router(chat.router)

@app.get("/")
async def root():
    return {"message": "RepoSage API is running"}