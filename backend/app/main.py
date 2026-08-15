from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import profile, repos, suggestions

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

@app.get("/")
async def root():
    return {"message": "RepoSage API is running"}