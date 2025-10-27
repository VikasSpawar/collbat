import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// --- MOCK API DATA & FUNCTIONS (Normally in projectAPI.js) ---

const MOCK_PROJECTS = [
  { id: 'proj-001', name: 'Q4 Marketing Blitz', description: 'Coordinate final push for product launch.', last_update: '2 hours ago', members: 4 },
  { id: 'proj-002', name: 'Website Redesign 2025', description: 'Migrate to new React/Tailwind stack.', last_update: '1 day ago', members: 6 },
  { id: 'proj-003', name: 'Internal Training Docs', description: 'Update all onboarding materials.', last_update: '3 days ago', members: 2 },
];

const mockFetchProjects = () =>
  new Promise(resolve => setTimeout(() => resolve(MOCK_PROJECTS), 500));

const mockCreateProject = (newProjectData) => {
  const newId = `proj-${Date.now()}`;
  const project = {
    id: newId,
    ...newProjectData,
    last_update: 'just now',
    members: 1,
  };
  MOCK_PROJECTS.unshift(project);
  return Promise.resolve(project);
};

// --- MOCK HOOKS ---

const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    mockFetchProjects().then(data => {
      setProjects(data);
      setIsLoading(false);
    });
  }, []);

  const createProject = async (name, description) => {
    const newProject = await mockCreateProject({ name, description });
    setProjects(prev => [newProject, ...prev.filter(p => p.id !== newProject.id)]);
    return newProject;
  };

  return { projects, isLoading, createProject };
};

// --- COMPONENTS ---

const Dashboard = () => {
  const { projects, isLoading, createProject } = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-900 font-sans text-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-700">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">My Projects Hub</h2>
          <button
            className="bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold py-2 px-6 rounded-full shadow-lg transition-colors duration-200"
            onClick={() => setIsModalOpen(true)}
          >
            + Create Project
          </button>
        </div>

        <h3 className="text-xl font-semibold mb-3 text-teal-400">Recent & Active Projects</h3>
        <ProjectsList projects={projects} isLoading={isLoading} />
      </div>

      {isModalOpen && (
        <ProjectCreationModal
          onCreate={async (name, description) => {
            await createProject(name, description);
            setIsModalOpen(false);
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

const ProjectCard = ({ project }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-800 rounded-2xl shadow-lg p-6 border-2 border-gray-700 hover:border-teal-500 transition-all duration-200 group">
      <div className="flex items-center mb-3 space-x-3">
        <div className="w-10 h-10 rounded-full bg-teal-700 flex items-center justify-center font-extrabold text-lg text-white shadow">
          {project.name.slice(0, 2).toUpperCase()}
        </div>
        <h4 className="text-xl font-bold text-white truncate">{project.name}</h4>
      </div>
      <p className="text-sm text-gray-400 mb-4">{project.description || 'No description provided.'}</p>
      <div className="flex justify-between text-xs text-gray-500 mb-3">
        <span>👥 <span className="text-teal-400">{project.members}</span> Members</span>
        <span>🕒 {project.last_update}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <ProjectFeatureButton feature="kanban" projectId={project.id} />
        <ProjectFeatureButton feature="whiteboard" projectId={project.id} />
        <ProjectFeatureButton feature="documents" projectId={project.id} />
        <ProjectFeatureButton feature="chat" projectId={project.id} />
        <ProjectFeatureButton feature="video" projectId={project.id} />
      </div>
    </div>
  );
};

const ProjectFeatureButton = ({ feature, projectId }) => {
  const navigate = useNavigate();
  const displayText = feature[0].toUpperCase() + feature.slice(1);

  return (
    <button
      className="bg-teal-800/30 hover:bg-teal-700 text-teal-300 font-semibold py-2 rounded-xl transition-all duration-150 text-xs"
      onClick={() => navigate(`/project/${projectId}/${feature}`)}
    >
      {displayText}
    </button>
  );
};

const ProjectsList = ({ projects, isLoading }) => {
  if (isLoading)
    return <p className="text-center py-20 text-teal-400 animate-pulse">Loading projects...</p>;
  if (projects.length === 0)
    return (
      <p className="text-center py-20 text-gray-400">
        No projects yet. Start by clicking <span className="text-teal-400 font-bold">"Create Project"</span>!
      </p>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 mt-5">
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
};

const ProjectCreationModal = ({ onCreate, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md relative border-teal-500 border-2">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-teal-400 text-2xl"
        >&times;</button>
        <h3 className="text-teal-400 text-xl font-bold mb-5">Create New Project</h3>
        <form
          className="space-y-5"
          onSubmit={e => {
            e.preventDefault();
            if (name.trim()) {
              onCreate(name, description);
              setName('');
              setDescription('');
            }
          }}
        >
          <input
            type="text"
            placeholder="Project Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-gray-100 placeholder-gray-400 focus:border-teal-500 focus:ring-teal-500 outline-none"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-gray-100 placeholder-gray-400 focus:border-teal-500 focus:ring-teal-500 outline-none"
          />
          <button
            type="submit"
            className="bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold py-2 px-6 rounded-full shadow-md w-full transition-all"
          >Create Project</button>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
