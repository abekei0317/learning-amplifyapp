import React, { useState, useEffect } from 'react'
import './App.css'
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react'
import { API, graphqlOperation } from 'aws-amplify'
import { GraphQLResult } from '@aws-amplify/api'
import * as queries from './graphql/queries'
import * as mutations from './graphql/mutations'
import {
  Note,
  ListNotesQuery,
  CreateNoteMutationVariables,
  CreateNoteMutation,
  DeleteNoteMutationVariables,
} from './API'

const App = () => {
  const initialFormState = { name: '', description: '' }
  const [notes, setNotes] = useState<Note[]>([])
  const [formData, setFormData] = useState(initialFormState)

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    const responce = (await API.graphql(
      graphqlOperation(queries.listNotes)
    )) as GraphQLResult<ListNotesQuery>
    if (responce.data?.listNotes?.items) {
      const notes = responce.data?.listNotes?.items.filter(
        (item): item is NonNullable<typeof item> => item != null
      )
      setNotes(notes)
    }
  }

  const createNote = async () => {
    if (!formData.name || !formData.description) return
    const responce = (await API.graphql(
      graphqlOperation(mutations.createNote, {
        input: formData,
      } as CreateNoteMutationVariables)
    )) as GraphQLResult<CreateNoteMutation>
    if (responce.data?.createNote) {
      setNotes([...notes, responce.data?.createNote])
    }
    setFormData(initialFormState)
  }

  const deleteNote = async (note: Note) => {
    const id = note.id
    const newNotesArray = notes.filter((note) => note.id !== id)
    setNotes(newNotesArray)
    await API.graphql(
      graphqlOperation(mutations.deleteNote, {
        input: { id },
      } as DeleteNoteMutationVariables)
    )
  }

  return (
    <div className="App">
      <header>
        <h1>My Notes App</h1>
        <input
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Note name"
          value={formData.name}
        />
        <input
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          placeholder="Note description"
          value={formData.description}
        />
        <button onClick={createNote}>Create Note</button>
        <div style={{ marginBottom: 30 }}>
          {notes.map((note) => (
            <div key={note.id || note.name}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              <button onClick={() => deleteNote(note)}>Delete note</button>
            </div>
          ))}
        </div>
      </header>
      <AmplifySignOut />
    </div>
  )
}

export default withAuthenticator(App)
